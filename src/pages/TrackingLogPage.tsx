import { useMemo, useState } from 'react';
import { useLogs } from '@/hooks/useLogs';
import { usePatients } from '@/hooks/usePatients';
import type { ProgramType, Patient } from '@/db/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrackingLogPageProps {
  program: ProgramType;
}

export default function TrackingLogPage({ program }: TrackingLogPageProps) {
  const { logs } = useLogs(program);
  const { patients } = usePatients(program);
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Group logs by patient and get unique patients with no-show activity
  const uniquePatients = useMemo(() => {
    if (!logs || !Array.isArray(logs) || !patients || !Array.isArray(patients)) return [];
    
    const logsWithNames = logs
      .filter(l => l && l.patientId)
      .map(l => ({
      ...l,
      patientName: patients.find(p => p && p.id === l.patientId)?.name || 'Unknown',
      patient: patients.find(p => p && p.id === l.patientId),
    }))
      .filter(l => l.patient); // Only include logs where patient exists

    // Get unique patients who have logs matching search
    const uniqueMap = new Map();
    logsWithNames.forEach(l => {
      const matchesSearch = !search ||
        l.patientName.toLowerCase().includes(search.toLowerCase()) ||
        (l.reason && l.reason.toLowerCase().includes(search.toLowerCase()));
      
      if (matchesSearch && !uniqueMap.has(l.patientId)) {
        uniqueMap.set(l.patientId, {
          id: l.patientId,
          name: l.patientName,
          patient: l.patient,
          lastLog: l,
        });
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => {
      try {
        return new Date(b.lastLog.date).getTime() - new Date(a.lastLog.date).getTime();
      } catch {
        return 0;
      }
    });
  }, [logs, patients, search]);

  // Get all logs for a specific patient
  const getPatientLogs = (patientId: string) => {
    if (!logs || !Array.isArray(logs)) return [];
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return []; // Exclude orphaned logs
    return logs
      .filter(l => l && l.patientId === patientId)
      .map(l => ({
        ...l,
        patientName: patient.name,
      }))
      .sort((a, b) => {
        try {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } catch {
          return 0;
        }
      });
  };

  const getDaysOverdue = (patient: Patient) => {
    if (!patient.nextDueDate || patient.status !== 'overdue') return 0;
    const due = parseISO(patient.nextDueDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const overdueDistribution = useMemo(() => {
    const buckets: Record<string, number> = {
      '0-7': 0,
      '8-14': 0,
      '15-30': 0,
      '31+': 0,
    };

    const relevantPatients = selectedPatientId
      ? patients.filter(p => p.id === selectedPatientId)
      : patients;

    relevantPatients
      .filter(p => p.status === 'overdue' && p.nextDueDate)
      .forEach(p => {
        const days = getDaysOverdue(p);
        if (days <= 7) buckets['0-7']++;
        else if (days <= 14) buckets['8-14']++;
        else if (days <= 30) buckets['15-30']++;
        else buckets['31+']++;
      });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [patients, selectedPatientId]);

  const selectedPatient = selectedPatientId 
    ? uniquePatients.find(p => p.id === selectedPatientId)
    : null;
  const selectedPatientLogs = selectedPatientId ? getPatientLogs(selectedPatientId) : [];

  const totalLogs = logs?.filter(l => patients.some(p => p.id === l.patientId)).length || 0;
  const totalPatients = patients?.length || 0;
  const followUpCount = logs.filter(l => l.action === 'follow-up-call' && patients.some(p => p.id === l.patientId)).length;
  const noShowCount = logs.filter(l => l.action === 'no-show' && patients.some(p => p.id === l.patientId)).length;
  const overdueCount = patients.filter(p => p.status === 'overdue').length;
  const averageDaysOverdue = patients
    .filter(p => p.status === 'overdue' && p.nextDueDate)
    .map(p => getDaysOverdue(p))
    .reduce((sum, n) => sum + n, 0) || 0;
  const overdueAverage = overdueCount ? Math.round(averageDaysOverdue / overdueCount) : 0;

  const handleDownload = (fileFormat: 'excel' | 'word' | 'pdf') => {
    // Get all logs with patient names, filtered by search, excluding orphaned logs
    const logsToExport = logs
      .map(l => ({
        ...l,
        patient: patients.find(p => p.id === l.patientId),
        patientName: patients.find(p => p.id === l.patientId)?.name || 'Unknown',
      }))
      .filter(l => l.patient) // Exclude orphaned logs
      .filter(l => {
        const matchesSearch = !search ||
          l.patientName.toLowerCase().includes(search.toLowerCase()) ||
          (l.reason && l.reason.toLowerCase().includes(search.toLowerCase()));
        return matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Simple CSV export for now - can be enhanced later
    const csv = [
      ['Date', 'Patient', 'Action', 'Reason'],
      ...logsToExport.map(l => [
        format(new Date(l.date), 'dd MMM yyyy HH:mm'),
        l.patientName,
        l.action === 'follow-up-call' ? 'Follow-up call' :
        l.action === 'no-show' ? 'No show' : l.action,
        l.reason || '-'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `defaulter-tracing-log-${program}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Defaulter Tracing Log</h2>
          <p className="text-sm text-muted-foreground">Monitor patient follow-up, no-shows, and overdue cases with clear actions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleDownload('excel')}>Excel</Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('word')}>Word</Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')}>PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border">
          <CardContent className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total logs</p>
            <p className="text-2xl font-semibold">{totalLogs}</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Overdue patients</p>
            <p className="text-2xl font-semibold">{overdueCount}</p>
            <Badge variant="secondary">Avg overdue {overdueAverage} days</Badge>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Follow-up actions</p>
            <p className="text-2xl font-semibold">{followUpCount}</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">No-shows</p>
            <p className="text-2xl font-semibold">{noShowCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient, reason, or status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Clear</Button>
          <Badge variant="outline" className="text-foreground">Patient count: {totalPatients}</Badge>
        </div>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient/Client</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Overdue (days)</TableHead>
              <TableHead>Last Action</TableHead>
              <TableHead>Last Visit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uniquePatients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  No matching defaulter tracing records found.
                </TableCell>
              </TableRow>
            )}
            {uniquePatients.map(p => {
              const status = p.patient?.status ?? 'unknown';
              const daysOverdue = getDaysOverdue(p.patient || ({ nextDueDate: '', status: 'active' } as Patient));
              const actionLabel = p.lastLog.action === 'follow-up-call' ? 'Follow-up call' : p.lastLog.action === 'no-show' ? 'No show' : p.lastLog.action;
              const statusBadge = status === 'overdue' ? 'destructive' : status === 'active' ? 'secondary' : 'outline';

              return (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/60"
                  onClick={() => setSelectedPatientId(p.id)}
                >
                  <TableCell className="font-semibold">{p.name}</TableCell>
                  <TableCell>{p.patient?.facility || 'Not set'}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadge as any} className="text-xs px-2 py-1">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{daysOverdue}</TableCell>
                  <TableCell>{actionLabel}</TableCell>
                  <TableCell>{format(new Date(p.lastLog.date), 'dd MMM yyyy HH:mm')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1">
              <CardTitle>Overdue Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">
                {selectedPatientId
                  ? `Selected patient view: ${selectedPatient?.name || 'unknown'} (drilldown)`
                  : 'Showing all overdue cases (click row to view patient-specific buckets)'}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overdueDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Detail Dialog */}
      <Dialog open={!!selectedPatientId} onOpenChange={(open) => { if (!open) setSelectedPatientId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPatient?.name}</DialogTitle>
            <DialogDescription>Activity history and patient details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPatientLogs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Activity History</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPatientLogs.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">{format(new Date(l.date), 'dd MMM yyyy HH:mm')}</TableCell>
                        <TableCell className="text-sm">{
                          l.action === 'follow-up-call' ? 'Follow-up call' :
                          l.action === 'no-show' ? 'No show' : l.action
                        }</TableCell>
                        <TableCell className="text-sm">{l.reason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {selectedPatient?.patient?.tbRescheduledDate && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Rescheduled Appointment</h3>
                <p className="text-sm">New appointment date: <span className="font-medium">{format(new Date(selectedPatient.patient.tbRescheduledDate), 'dd MMM yyyy')}</span></p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
