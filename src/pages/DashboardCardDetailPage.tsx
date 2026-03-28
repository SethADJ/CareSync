import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TBPatientProfile from '@/components/TBPatientProfile';
import HIVPatientProfile from '@/components/HIVPatientProfile';
import { ProgramType, type Patient } from '@/db/database';
import { format, parseISO } from 'date-fns';
import { usePatients } from '@/hooks/usePatients';
import { useLogs } from '@/hooks/useLogs';
import { toast } from 'sonner';

export default function DashboardCardDetailPage() {
  const params = useParams<{ program?: ProgramType; filter?: string }>();
  const filter = params.filter;
  let program = params.program as ProgramType | undefined;

  if (!program) {
    const parts = window.location.pathname.split('/').filter(Boolean);
    program = parts[0] as ProgramType | undefined;
  }

  const { patients, dueToday, overdue, updatePatient, deletePatient, reload } = usePatients(program);
  const { addLog } = useLogs(program);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showFollowUpReason, setShowFollowUpReason] = useState(false);
  const [followUpReason, setFollowUpReason] = useState('');

  const updateStatus = (patient: Patient, status: Patient['status']) => {
    updatePatient?.(patient.id, { status });
    setSelectedPatient({ ...patient, status });
  };

  const removePatient = (patient: Patient) => {
    if (confirm(`Delete patient/client ${patient.name}?`)) {
      deletePatient?.(patient.id);
      if (selectedPatient?.id === patient.id) setSelectedPatient(null);
    }
  };

  const handleAttendance = async (patient: Patient, status: 'showed' | 'missed') => {
    const isHIV = patient.program === 'hivcare';
    const cycle = isHIV ? (patient.hivCurrentRefill ?? 1) : (patient.tbCurrentCycle ?? 1);
    const attendanceKey = isHIV ? 'hivAttendance' : 'tbAttendance';
    const attendance = { ...(patient[attendanceKey] || {}), [cycle]: status };

    if (status === 'showed') {
      const maxCycle = isHIV ? 12 : 7;
      const nextCycle = Math.min(cycle + 1, maxCycle);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const updated: Partial<Patient> = isHIV
        ? { hivAttendance: attendance, hivCurrentRefill: nextCycle, hivRescheduledDate: today, status: 'ok' }
        : { tbAttendance: attendance, tbCurrentCycle: nextCycle, tbRescheduledDate: today, status: 'ok' };
      await updatePatient?.(patient.id, updated);
      setSelectedPatient({ ...patient, ...updated });
      addLog?.({
        patientId: patient.id,
        program: patient.program,
        date: new Date().toISOString(),
        action: 'follow-up-call',
      });
      reload();
      toast.success(`✓ Marked ${patient.name} as showed. Adherence rate updated. Next cycle: ${nextCycle}`);
    } else {
      const updated: Partial<Patient> = isHIV
        ? { hivAttendance: attendance, status: 'overdue' as const }
        : { tbAttendance: attendance, status: 'overdue' as const };
      await updatePatient?.(patient.id, updated);
      setSelectedPatient({ ...patient, ...updated });
      addLog?.({
        patientId: patient.id,
        program: patient.program,
        date: new Date().toISOString(),
        action: 'no-show',
        reason: followUpReason || undefined,
      });
      reload();
      toast.warning(`⚠ Marked ${patient.name} as did not show. Added to defaulters. Logged for follow-up.`);
      setShowFollowUpReason(true);
    }
  };

  const getDaysOverdue = (patient: Patient) => {
    if (!patient.nextDueDate || patient.status !== 'overdue') return 0;
    const due = parseISO(patient.nextDueDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleCall = (patient: Patient) => {
    if (!patient.phone) return;
    window.open(`tel:${patient.phone}`);
  };

  const overdueCount = useMemo(() => patients.filter(p => p.status === 'overdue').length, [patients]);
  const dueCount = useMemo(() => patients.filter(p => p.status === 'due').length, [patients]);
  const defaulterDaysAverage = useMemo(() => {
    const overduePatients = patients.filter(p => p.status === 'overdue' && p.nextDueDate);
    if (overduePatients.length === 0) return 0;
    const totalDays = overduePatients.reduce((sum, p) => sum + getDaysOverdue(p), 0);
    return Math.round(totalDays / overduePatients.length);
  }, [patients]);

  let filteredPatients = patients;
  let title = 'Patients';
  if (filter === 'dueToday') {
    filteredPatients = dueToday;
    title = 'Patients Due Today';
  } else if (filter === 'dueTomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    filteredPatients = patients.filter(p => {
      if (!p.nextDueDate) return false;
      const d = new Date(p.nextDueDate);
      return d.toDateString() === tomorrow.toDateString();
    });
    title = 'Patients Due Tomorrow';
  } else if (filter === 'defaulters') {
    filteredPatients = overdue;
    title = 'Defaulters';
  } else if (filter === 'dueThisWeek') {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    filteredPatients = patients.filter(p => {
      if (!p.nextDueDate) return false;
      const d = new Date(p.nextDueDate);
      return d >= weekStart && d <= weekEnd;
    });
    title = 'Patients Due This Week';
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title} ({filteredPatients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPatients.length === 0 ? (
            <p className="text-muted-foreground">No patient/clients found for this category.</p>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map(p => (
                <Card
                  key={p.id}
                  className="cursor-pointer border-border bg-background p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/50 hover:ring-1 hover:ring-primary/20"
                  onClick={() => setSelectedPatient(p)}
                >
                  <div className="flex items-start justify-between gap-4">                    <div>
                      <p className="text-xs text-muted-foreground">{p.systemId || `${p.program?.toUpperCase()}/UID/${p.id}`}</p>
                      <h3 className="text-xl font-bold text-foreground">{p.name}</h3>
                      <p className="text-sm text-muted-foreground">{p.phone || 'No phone'}</p>
                      <p className="text-sm text-muted-foreground">Facility: {p.facility || 'N/A'} | Location: {p.location || 'N/A'}</p>
                      <p className="mt-1 text-sm">Next due: <strong>{p.nextDueDate ? format(parseISO(p.nextDueDate), 'dd MMM yyyy') : 'N/A'}</strong></p>
                      {p.status === 'overdue' && (
                        <p className="text-xs text-destructive">Days overdue: {getDaysOverdue(p)}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === 'overdue' ? 'bg-destructive/15 text-destructive' : p.status === 'due' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
                      {p.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                      onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); }}
                    >
                      Edit
                    </button>
                    <a
                      className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                      href={`tel:${p.phone || ''}`}
                      onClick={(e) => { if (!p.phone) e.preventDefault(); }}
                    >
                      Call
                    </a>
                    <button
                      className="px-3 py-1 rounded border border-success bg-success/10 text-success hover:bg-success/20"
                      onClick={() => handleAttendance(p, 'showed')}
                    >
                      Showed
                    </button>
                    <button
                      className="px-3 py-1 rounded border border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20"
                      onClick={() => handleAttendance(p, 'missed')}
                    >
                      Did Not Show
                    </button>
                    <button
                      className="ml-auto px-3 py-1 rounded border border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => removePatient(p)}
                    >
                      Delete
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {program === 'tbcare' && (
        <TBPatientProfile
          patient={selectedPatient}
          open={!!selectedPatient}
          onOpenChange={(open) => { if (!open) setSelectedPatient(null); }}
        />
      )}
      {program === 'hivcare' && (
        <HIVPatientProfile
          patient={selectedPatient}
          open={!!selectedPatient}
          onOpenChange={(open) => { if (!open) setSelectedPatient(null); }}
        />
      )}

      {showFollowUpReason && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">No-Show Follow-up</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Enter a follow-up reason for {selectedPatient.name}.
            </p>
            <textarea
              className="w-full rounded border border-border p-2 text-sm"
              value={followUpReason}
              onChange={(e) => setFollowUpReason(e.target.value)}
              rows={4}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="rounded border border-slate-300 px-3 py-1 text-sm"
                onClick={() =>setShowFollowUpReason(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-primary px-3 py-1 text-sm text-white"
                onClick={() => {
                  setShowFollowUpReason(false);
                  setFollowUpReason('');
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
