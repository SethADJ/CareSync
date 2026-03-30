import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePatients } from '@/hooks/usePatients';
import { useLogs } from '@/hooks/useLogs';
import { useLicense } from '@/hooks/useLicense';
import type { Patient, ProgramType } from '@/db/database';
import { getProgramLabel } from '@/utils/program-logic';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, Trash2, Edit2, Lock, ChevronDown, ChevronUp, CheckCircle, XCircle, Download, Upload, FileSpreadsheet, AlertTriangle, CalendarClock, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfDay, addDays, parseISO, isWithinInterval, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { generateSystemId } from '@/utils/system-id';
import TBPatientProfile from '@/components/TBPatientProfile';
import HIVPatientProfile from '@/components/HIVPatientProfile';
import { getUserProfile } from '@/pages/SignupPage';
import { downloadTBTemplate, parseTBExcel } from '@/utils/excel-import';
import { SwipeableRow } from '@/components/SwipeableRow';

interface ProgramPageProps {
  program: ProgramType;
}

export default function ProgramPage({ program }: ProgramPageProps) {
  const { patients, addPatient, updatePatient, deletePatient, isLoading } = usePatients(program);
  const { addLog } = useLogs(program);
  const { isModuleUnlocked } = useLicense();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');
  const [dialogOpen, setDialogOpen] = useState(() => searchParams.get('addPatient') === 'true');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profilePatient, setProfilePatient] = useState<Patient | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [hasDownloadedTemplate, setHasDownloadedTemplate] = useState(false);
  const [reschedulePatient, setReschedulePatient] = useState<Patient | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  // follow-up call dialog state
  const [followUpPatient, setFollowUpPatient] = useState<Patient | null>(null);
  const [followUpReason, setFollowUpReason] = useState('');
  const [showFollowUpReason, setShowFollowUpReason] = useState(false);

  // selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const parsed = await parseTBExcel(file);
      for (const p of parsed) {
        await addPatient(p);
      }
      toast.success(`${parsed.length} patient(s) imported successfully`);
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };


  // TBCare: mark attendance
  const getDaysOverdue = (patient: Patient) => {
    if (!patient.nextDueDate || patient.status !== 'overdue') return 0;
    const due = parseISO(patient.nextDueDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleAttendance = (patient: Patient, status: 'showed' | 'missed') => {
    const isHIV = program === 'hivcare';
    const cycle = isHIV ? (patient.hivCurrentRefill ?? 1) : (patient.tbCurrentCycle ?? 1);
    const attendanceKey = isHIV ? 'hivAttendance' : 'tbAttendance';
    const attendance = { ...(patient[attendanceKey] || {}), [cycle]: status };

    if (status === 'missed') {
      addLog({
        patientId: patient.id,
        program,
        date: new Date().toISOString(),
        action: 'no-show',
      });
      setFollowUpPatient(patient);
      setFollowUpReason('');
      toast.warning(`⚠ Marked ${patient.name} as did not show. Added to defaulters. Will affect adherence rate.`);
      return;
    }

    // Showed: advance cycle, update reschedule date to today so nextDueDate is recalculated correctly
    const maxCycle = isHIV ? 12 : 7;
    const nextCycle = Math.min(cycle + 1, maxCycle);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    if (isHIV) {
      updatePatient(patient.id, { hivAttendance: attendance, hivCurrentRefill: nextCycle, hivRescheduledDate: today, status: 'ok' });
    } else {
      updatePatient(patient.id, { tbAttendance: attendance, tbCurrentCycle: nextCycle, tbRescheduledDate: today, status: 'ok' });
    }
    addLog({
      patientId: patient.id,
      program,
      date: new Date().toISOString(),
      action: 'follow-up-call',
    });
    toast.success(`✓ Marked ${patient.name} as showed. Adherence logged. Cycle: ${nextCycle}`);
  };

  const handleFollowUpConfirm = () => {
    if (!followUpPatient) return;
    // Only require reason if showing the reason field
    if (showFollowUpReason && !followUpReason.trim()) {
      toast.error('Please provide the reason for not showing up');
      return;
    }
    addLog({
      patientId: followUpPatient.id,
      program,
      date: new Date().toISOString(),
      action: 'follow-up-call',
      reason: followUpReason || undefined,
    });
    setFollowUpPatient(null);
    setFollowUpReason('');
    setShowFollowUpReason(false);
    // Open reschedule dialog
    setReschedulePatient(followUpPatient);
    setRescheduleDate('');
  };

  const handleFollowUpSkip = () => {
    if (!followUpPatient) return;
    if (showFollowUpReason) {
      // Cancel out of reason entry, go back to Yes/No
      setShowFollowUpReason(false);
      setFollowUpReason('');
      return;
    }
    // Open reschedule dialog without logging follow-up
    setReschedulePatient(followUpPatient);
    setRescheduleDate('');
    setFollowUpPatient(null);
    setFollowUpReason('');
  };

  const handleFollowUpYes = () => {
    setShowFollowUpReason(true);
  };

  const handleReschedule = () => {
    if (!reschedulePatient || !rescheduleDate) {
      toast.error('Please select a new appointment date');
      return;
    }
    const isHIV = reschedulePatient.program === 'hivcare';
    const cycle = isHIV ? (reschedulePatient.hivCurrentRefill ?? 1) : (reschedulePatient.tbCurrentCycle ?? 1);
    const attendanceKey = isHIV ? 'hivAttendance' : 'tbAttendance';
    const attendance = { ...(reschedulePatient[attendanceKey] || {}), [cycle]: 'missed' as const };

    if (isHIV) {
      updatePatient(reschedulePatient.id, {
        hivAttendance: attendance,
        hivRescheduledDate: rescheduleDate,
        status: 'overdue',
      });
    } else {
      updatePatient(reschedulePatient.id, {
        tbAttendance: attendance,
        tbRescheduledDate: rescheduleDate,
        status: 'overdue',
      });
    }
    toast.success(`Rescheduled — all remaining visits updated from ${format(new Date(rescheduleDate), 'dd MMM yyyy')}`);
    setReschedulePatient(null);
    setRescheduleDate('');
  };

  if (program === 'epi' || program === 'anc') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Lock className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Under Development</h2>
        <p className="text-muted-foreground mb-4">{getProgramLabel(program)} module is currently under development.</p>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  if (!isModuleUnlocked(program)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Lock className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Module Locked</h2>
        <p className="text-muted-foreground mb-4">{getProgramLabel(program)} requires activation.</p>
        <Button onClick={() => navigate('/activation')}>Enter License Key</Button>
      </div>
    );
  }

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const filteredByFilter = useMemo(() => {
    if (!filter) return patients;

    if (filter === 'dueToday') {
      return patients.filter(p => p.status === 'due');
    }

    if (filter === 'defaulters') {
      return patients.filter(p => p.status === 'overdue');
    }

    if (filter === 'dueTomorrow') {
      return patients.filter(p => {
        if (!p.nextDueDate) return false;
        try {
          return isSameDay(parseISO(p.nextDueDate), tomorrow);
        } catch {
          return false;
        }
      });
    }

    if (filter === 'dueThisWeek') {
      return patients.filter(p => {
        if (!p.nextDueDate) return false;
        try {
          return isWithinInterval(parseISO(p.nextDueDate), { start: weekStart, end: weekEnd });
        } catch {
          return false;
        }
      });
    }

    return patients;
  }, [filter, patients, tomorrow, weekEnd, weekStart]);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return filteredByFilter.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.phone.includes(search) ||
      (p.systemId?.toLowerCase().includes(lower))
    );
  }, [filteredByFilter, search]);

  const handleSave = async (data: Partial<Patient>) => {
    if (editingPatient?.id) {
      await updatePatient(editingPatient.id, data);
      toast.success('Patient updated');
    } else {
      // Generate system ID for new patients
      const systemId = generateSystemId(data.name || '', program);
      await addPatient({
        ...data,
        systemId,
        program,
        dateRegistered: new Date().toISOString(),
      } as Omit<Patient, 'id'>);
      toast.success('Patient added');
    }
    setDialogOpen(false);
    setEditingPatient(null);
  };

  const handleDelete = async (id: string) => {
    await deletePatient(id);
    toast.success('Patient removed');
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading patients...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{getProgramLabel(program)}</h2>
              <p className="text-muted-foreground">{filtered.length} patients</p>
            </div>
        <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto">
          <Button size="sm" variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />Import Excel
          </Button>

          {/* Excel Upload Dialog */}
          <Dialog open={uploadDialogOpen} onOpenChange={(open) => { setUploadDialogOpen(open); if (!open) setHasDownloadedTemplate(false); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Import Patients from Excel
                </DialogTitle>
                <DialogDescription>
                  Upload patient data using the required template format. Unauthorized or incorrectly formatted data will be rejected.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Step 1: Download Template */}
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                    <span className="font-medium text-foreground">Download Template</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-8">
                    Download the required Excel template, fill in patient data, then come back to upload.
                  </p>
                  <div className="ml-8">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { downloadTBTemplate(); setHasDownloadedTemplate(true); }}
                      className="gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                    {hasDownloadedTemplate && (
                      <p className="text-xs text-success mt-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Template downloaded
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 2: Upload */}
                <div className={`rounded-lg border p-4 space-y-2 ${!hasDownloadedTemplate ? 'border-border opacity-60' : 'border-primary/30 bg-primary/5'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${hasDownloadedTemplate ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</span>
                    <span className="font-medium text-foreground">Upload Completed Template</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-8">
                    Only files matching the template format will be accepted.
                  </p>
                  <div className="ml-8">
                    <Button
                      size="sm"
                      disabled={!hasDownloadedTemplate || uploading}
                      asChild={hasDownloadedTemplate && !uploading}
                    >
                      {hasDownloadedTemplate && !uploading ? (
                        <label className="cursor-pointer gap-1">
                          <Upload className="h-4 w-4" />
                          Choose File & Upload
                          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { handleExcelUpload(e); setUploadDialogOpen(false); setHasDownloadedTemplate(false); }} />
                        </label>
                      ) : (
                        <span className="gap-1">
                          <Upload className="h-4 w-4" />
                          {uploading ? 'Importing...' : 'Choose File & Upload'}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 p-3">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground">
                    <strong>Important:</strong> Only data from the official CareSync template will be processed. Unauthorized or incorrectly formatted spreadsheets will be rejected.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingPatient(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Patient</Button>
            </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPatient ? 'Edit' : 'Add'} Patient</DialogTitle>
              <DialogDescription>
                {editingPatient ? 'Update patient information' : 'Enter patient details to add them to the program'}
              </DialogDescription>
            </DialogHeader>
            <PatientForm
              program={program}
              patient={editingPatient}
              onSave={handleSave}
              onCancel={() => { setDialogOpen(false); setEditingPatient(null); }}
            />
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      {/* select all checkbox */}
      <div className="flex items-center mt-2 mb-1">
        <Checkbox
          checked={
            filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))
          }
          onCheckedChange={(checked) => {
            if (checked === true) {
              setSelectedIds(new Set(filtered.map(p => p.id)));
            } else {
              setSelectedIds(new Set());
            }
          }}
        />
        <span className="ml-2 text-sm">Select all</span>
      </div>

      <div className="space-y-2">
        {filtered.map((patient, i) => (
          <motion.div
            key={patient.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <SwipeableRow
              onEdit={() => { setEditingPatient(patient); setDialogOpen(true); }}
              onDelete={() => patient.id && handleDelete(patient.id)}
              onCall={patient.phone ? () => {
                addLog({
                  patientId: patient.id,
                  program,
                  date: new Date().toISOString(),
                  action: 'follow-up-call',
                });
                window.open(`tel:${patient.phone}`);
              } : undefined}
            >
              <Card
                className="program-card cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setProfilePatient(patient)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Checkbox
                      checked={selectedIds.has(patient.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedIds);
                          if (checked === true) next.add(patient.id);
                        else next.delete(patient.id);
                        setSelectedIds(next);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      {patient.systemId && (
                        <p className="text-xs font-mono text-primary mb-0.5">{patient.systemId}</p>
                      )}
                      <p className="font-semibold text-foreground truncate">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">{patient.phone}</p>
                      {patient.facility && (
                        <p className="text-xs text-muted-foreground">Facility: {patient.facility}</p>
                      )}
                      {program === 'hivcare' && patient.artRegimen && (
                        <p className="text-xs text-muted-foreground">
                          ART: {patient.artRegimen === 'other' ? patient.artRegimenOther : patient.artRegimen}
                        </p>
                      )}
                      {program === 'hivcare' && patient.viralLoadHistory && patient.viralLoadHistory.length > 0 && (
                        <p className={`text-xs font-medium ${
                          patient.viralLoadHistory[patient.viralLoadHistory.length - 1].copies < 50
                            ? 'text-green-600' : 'text-destructive'
                        }`}>
                          VL: {patient.viralLoadHistory[patient.viralLoadHistory.length - 1].copies < 50 ? 'Suppressed' : 'Unsuppressed'}
                        </p>
                      )}
                      {patient.location && (
                        <p className="text-xs text-muted-foreground">Location: {patient.location}</p>
                      )}
                      {patient.nextDueDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Next due: {format(new Date(patient.nextDueDate), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {patient.status === 'due' && <span className="status-badge-due">Due</span>}
                      {patient.status === 'overdue' && (
                        <div className="flex flex-col items-end">
                          <span className="status-badge-overdue">Overdue</span>
                          <span className="text-xs text-destructive mt-1">{getDaysOverdue(patient)} day{getDaysOverdue(patient) === 1 ? '' : 's'}</span>
                        </div>
                      )}
                      {patient.status === 'ok' && <span className="status-badge-ok">On track</span>}
                      {patient.status === 'completed' && <span className="status-badge-ok">Complete</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 min-w-[6.5rem] text-xs"
                      onClick={() => { setEditingPatient(patient); setDialogOpen(true); }}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />Edit
                    </Button>
                    {patient.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 min-w-[6.5rem] text-xs border-green-600/30 text-green-600 hover:bg-green-500/10"
                        onClick={() => {
                          // log the call then open dialer
                          addLog({
                            patientId: patient.id,
                            program,
                            date: new Date().toISOString(),
                            action: 'follow-up-call',
                          });
                          window.location.href = `tel:${patient.phone}`;
                        }}
                      >
                        <Phone className="h-3 w-3 mr-1" />Call
                      </Button>
                    )}

                    {(program === 'tbcare' || program === 'hivcare') && patient.status !== 'completed' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 min-w-[6.5rem] text-xs border-green-600/30 text-green-600 hover:bg-green-500/10"
                          onClick={() => handleAttendance(patient, 'showed')}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />Showed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 min-w-[6.5rem] text-xs border-red-600/30 text-red-600 hover:bg-red-500/10"
                          onClick={() => handleAttendance(patient, 'missed')}
                        >
                          <XCircle className="h-3 w-3 mr-1" />Did Not Show
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 min-w-[6.5rem] text-xs text-destructive border-destructive/30 ml-auto"
                      onClick={() => patient.id && handleDelete(patient.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </SwipeableRow>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <Card className="program-card">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No patients found. Add your first patient above.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Patient Profile Dialog */}
      {program === 'tbcare' && (
        <TBPatientProfile
          patient={profilePatient}
          open={!!profilePatient}
          onOpenChange={(open) => { if (!open) setProfilePatient(null); }}
        />
      )}
      {program === 'hivcare' && (
        <HIVPatientProfile
          patient={profilePatient}
          open={!!profilePatient}
          onOpenChange={(open) => { if (!open) setProfilePatient(null); }}
          onUpdatePatient={(id, changes) => {
            updatePatient(id, changes);
            // Refresh profile patient data
            if (profilePatient && profilePatient.id === id) {
              setProfilePatient({ ...profilePatient, ...changes });
            }
          }}
        />
      )}

      {/* Follow-up Call Dialog */}
      <Dialog open={!!followUpPatient} onOpenChange={(open) => { if (!open) { setFollowUpPatient(null); setFollowUpReason(''); setShowFollowUpReason(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>No Show Recorded</DialogTitle>
            <DialogDescription>
              {showFollowUpReason ? `Enter ${followUpPatient?.name}'s reason for not showing up` : `Did you make a follow-up call to ${followUpPatient?.name}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {showFollowUpReason && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Patient's/Client's reason for not showing up</Label>
                <Input
                  placeholder="e.g., Was sick, transportation issue, etc."
                  value={followUpReason}
                  onChange={(e) => setFollowUpReason(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleFollowUpSkip}>
                {showFollowUpReason ? 'Cancel' : 'No'}
              </Button>
              <Button onClick={showFollowUpReason ? handleFollowUpConfirm : handleFollowUpYes}>
                {showFollowUpReason ? 'Save' : 'Yes'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={!!reschedulePatient} onOpenChange={(open) => { if (!open) { setReschedulePatient(null); setRescheduleDate(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-warning" />
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription>
              {reschedulePatient?.name} did not show for {reschedulePatient?.program === 'hivcare' ? `Refill #${reschedulePatient?.hivCurrentRefill ?? 1}` : `Month ${reschedulePatient?.tbCurrentCycle ?? 1}`}. 
              Set a new appointment date — all remaining visit dates will shift accordingly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">New Appointment Date</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            {rescheduleDate && (
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p className="text-xs font-medium text-foreground">Updated Schedule Preview:</p>
                {(() => {
                  const isHIV = reschedulePatient?.program === 'hivcare';
                  const cycle = isHIV ? (reschedulePatient?.hivCurrentRefill ?? 1) : (reschedulePatient?.tbCurrentCycle ?? 1);
                  const interval = isHIV ? (reschedulePatient?.hivRefillInterval ?? 90) : 28;
                  const totalCycles = isHIV ? 12 : 6;
                  const remaining = Array.from({ length: totalCycles - cycle + 1 }, (_, i) => {
                    const c = cycle + i;
                    const date = new Date(rescheduleDate);
                    date.setDate(date.getDate() + i * interval);
                    return { cycle: c, date };
                  });
                  return remaining.map(r => (
                    <p key={r.cycle} className="text-xs text-muted-foreground">
                      {isHIV ? `Refill #${r.cycle}` : `Month ${r.cycle}`}: <span className="font-medium text-foreground">{format(r.date, 'dd MMM yyyy')}</span>
                    </p>
                  ));
                })()}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setReschedulePatient(null); setRescheduleDate(''); }}>
                Cancel
              </Button>
              <Button onClick={handleReschedule} disabled={!rescheduleDate}>
                Confirm Reschedule
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      </>
    )}
    </div>
  );
}

// Country phone config
const COUNTRY_PHONE: Record<string, { code: string; digits: number; placeholder: string }> = {
  'South Africa': { code: '+27', digits: 9, placeholder: '812345678' },
  'Nigeria': { code: '+234', digits: 9, placeholder: '801234567' },
  'Kenya': { code: '+254', digits: 9, placeholder: '712345678' },
  'Ghana': { code: '+233', digits: 9, placeholder: '241234567' },
  'Ethiopia': { code: '+251', digits: 9, placeholder: '912345678' },
  'Tanzania': { code: '+255', digits: 9, placeholder: '712345678' },
  'Uganda': { code: '+256', digits: 9, placeholder: '712345678' },
  'Zimbabwe': { code: '+263', digits: 9, placeholder: '712345678' },
  'Mozambique': { code: '+258', digits: 9, placeholder: '841234567' },
  'Zambia': { code: '+260', digits: 9, placeholder: '971234567' },
  'DRC': { code: '+243', digits: 9, placeholder: '812345678' },
  'Cameroon': { code: '+237', digits: 9, placeholder: '671234567' },
  'Rwanda': { code: '+250', digits: 9, placeholder: '781234567' },
  'Malawi': { code: '+265', digits: 9, placeholder: '991234567' },
};

function getUserCountry(): string {
  try {
    const profile = JSON.parse(localStorage.getItem('caresync_user_profile') || '{}');
    return profile.country || 'South Africa';
  } catch {
    return 'South Africa';
  }
}

// Inline patient form component
function PatientForm({
  program,
  patient,
  onSave,
  onCancel,
}: {
  program: ProgramType;
  patient: Patient | null;
  onSave: (data: Partial<Patient>) => void;
  onCancel: () => void;
}) {
  const country = getUserCountry();
  const phoneConfig = COUNTRY_PHONE[country] || COUNTRY_PHONE['South Africa'];

  const [name, setName] = useState(patient?.name ?? '');
  const [sex, setSex] = useState<'male' | 'female' | ''>(patient?.sex ?? '');
  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (patient?.phone) {
      // Strip country code for editing
      const existing = patient.phone;
      if (existing.startsWith(phoneConfig.code)) {
        return existing.slice(phoneConfig.code.length);
      }
      return existing;
    }
    return '';
  });
  const userProfile = getUserProfile();
  const [facility] = useState(() => userProfile?.healthFacility ?? patient?.facility ?? '');
  const [location, setLocation] = useState(patient?.location ?? '');
  const [tbStartDate, setTbStartDate] = useState(patient?.tbStartDate ?? '');
  const [tbType, setTbType] = useState<'pulmonary-positive' | 'pulmonary-negative' | 'extra-pulmonary' | 'mdr' | ''>(patient?.tbType ?? '');
  const [tbExtraPulmonarySite, setTbExtraPulmonarySite] = useState(patient?.tbExtraPulmonarySite ?? '');
  const [completedMonths, setCompletedMonths] = useState(() => {
    if (patient?.tbCurrentCycle) return Math.max(0, (patient.tbCurrentCycle ?? 1) - 1);
    return 0;
  });
  const [lastRefillDate, setLastRefillDate] = useState(patient?.tbRescheduledDate ?? '');
  const [artStartDate, setArtStartDate] = useState(patient?.artStartDate ?? '');
  const [artRegimen, setArtRegimen] = useState<string>(patient?.artRegimen ?? '');
  const [artRegimenOther, setArtRegimenOther] = useState(patient?.artRegimenOther ?? '');
  const [whoStage, setWhoStage] = useState<string>(patient?.whoStage ?? '');
  const [cd4Count, setCd4Count] = useState(patient?.cd4Count?.toString() ?? '');
  const [cd4Date, setCd4Date] = useState(patient?.cd4Date ?? '');
  const [lastVLDate, setLastVLDate] = useState(patient?.lastViralLoadDate ?? '');
  const [lastVLCopies, setLastVLCopies] = useState(patient?.lastViralLoadCopies?.toString() ?? '');
  const [hivRefillInterval, setHivRefillInterval] = useState<string>(patient?.hivRefillInterval?.toString() ?? '90');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) { toast.error('Name must contain only letters and spaces'); return; }
    
    if (!sex.trim()) { toast.error('Sex is required'); return; }
    
    if (!location.trim()) { toast.error('Location is required'); return; }

    // Validate phone
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== phoneConfig.digits) {
      toast.error(`Phone number must be ${phoneConfig.digits} digits for ${country}`);
      return;
    }

    const fullPhone = cleanPhone ? `${phoneConfig.code}${cleanPhone}` : '';

    const data: Partial<Patient> = {
      name: name.trim(),
      sex: sex || undefined,
      phone: fullPhone,
      location: location.trim() || undefined,
    };

    if (program === 'tbcare') {
      data.facility = facility.trim() || undefined;
      data.tbStartDate = tbStartDate;
      data.tbType = tbType || undefined;
      data.tbExtraPulmonarySite = tbType === 'extra-pulmonary' ? tbExtraPulmonarySite.trim() : undefined;
      data.tbRescheduledDate = lastRefillDate || undefined;
      // Build attendance from completed months
      const attendance: Record<number, 'showed' | 'missed'> = { ...(patient?.tbAttendance ?? {}) };
      for (let i = 1; i <= completedMonths; i++) {
        if (!attendance[i]) attendance[i] = 'showed';
      }
      data.tbAttendance = attendance;
      data.tbCurrentCycle = completedMonths + 1;
    } else if (program === 'hivcare') {
      data.artStartDate = artStartDate;
      data.artRegimen = (artRegimen || undefined) as any;
      data.artRegimenOther = artRegimen === 'other' ? artRegimenOther.trim() : undefined;
      data.whoStage = (whoStage || undefined) as any;
      data.cd4Count = cd4Count ? Number(cd4Count) : undefined;
      data.cd4Date = cd4Date || undefined;
      data.lastViralLoadDate = lastVLDate || undefined;
      data.lastViralLoadCopies = lastVLCopies ? Number(lastVLCopies) : undefined;
      data.hivRefillInterval = (Number(hivRefillInterval) || 90) as any;
      data.facility = facility.trim() || undefined;
      // Build viral load history entry if new VL provided
      if (lastVLDate && lastVLCopies) {
        const copies = Number(lastVLCopies);
        const vlEntry = {
          date: lastVLDate,
          copies,
          status: copies < 50 ? 'suppressed' as const : 'unsuppressed' as const,
        };
        const existingHistory = patient?.viralLoadHistory ?? [];
        const alreadyExists = existingHistory.some(v => v.date === lastVLDate);
        data.viralLoadHistory = alreadyExists ? existingHistory : [...existingHistory, vlEntry];
      }
    }

    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Patient Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required />
      </div>
      <div>
        <Label>Sex</Label>
        <select
          value={sex}
          onChange={e => setSex(e.target.value as 'male' | 'female' | '')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        >
          <option value="">Select sex</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>
      <div>
        <Label>Phone Number ({country})</Label>
        <div className="flex gap-2">
          <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground min-w-[70px] justify-center">
            {phoneConfig.code}
          </div>
          <Input
            value={phoneNumber}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, phoneConfig.digits);
              setPhoneNumber(val);
            }}
            placeholder={phoneConfig.placeholder}
            type="tel"
            maxLength={phoneConfig.digits}
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{phoneConfig.digits} digits required</p>
      </div>

      {/* Health Facility - TBCare only */}
      {program === 'tbcare' && (
        <div>
          <Label>Health Facility</Label>
          <Input value={facility} disabled placeholder="Health facility from profile" />
        </div>
      )}

      <div>
        <Label>{program === 'tbcare' ? 'Residential Location / Town' : 'Location'}</Label>
        <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" required />
      </div>

      {program === 'tbcare' && (
        <>
          <div>
            <Label>Type of TB</Label>
            <select
              value={tbType}
              onChange={e => setTbType(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="">Select type</option>
              <option value="pulmonary-positive">Pulmonary TB (Positive)</option>
              <option value="pulmonary-negative">Pulmonary TB (Negative)</option>
              <option value="extra-pulmonary">Extra-Pulmonary TB</option>
              <option value="mdr">MDR-TB</option>
            </select>
          </div>
          {tbType === 'extra-pulmonary' && (
            <div>
              <Label>Extra-Pulmonary TB Site</Label>
              <Input
                value={tbExtraPulmonarySite}
                onChange={e => setTbExtraPulmonarySite(e.target.value)}
                placeholder="e.g. Lymph node, Pleural, Spinal, Meningeal"
                required
              />
            </div>
          )}
          <div>
            <Label>TB Treatment Start Date</Label>
            <Input type="date" value={tbStartDate} onChange={e => setTbStartDate(e.target.value)} required />
          </div>
          <div>
            <Label>Last Refill Date</Label>
            <Input 
              type="date" 
              value={lastRefillDate}
              onChange={e => setLastRefillDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Date of the patient's last medication refill
            </p>
          </div>
        </>
      )}

      {program === 'hivcare' && (
        <>
          <div>
            <Label>Health Facility</Label>
            <Input value={facility} disabled placeholder="Health facility from profile" />
          </div>
          <div>
            <Label>ART Start Date</Label>
            <Input type="date" value={artStartDate} onChange={e => setArtStartDate(e.target.value)} required />
          </div>
          <div>
            <Label>ART Regimen</Label>
            <select
              value={artRegimen}
              onChange={e => setArtRegimen(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="">Select regimen</option>
              <option value="TDF/3TC/DTG">TDF/3TC/DTG</option>
              <option value="TDF/3TC/EFV">TDF/3TC/EFV</option>
              <option value="AZT/3TC/NVP">AZT/3TC/NVP</option>
              <option value="AZT/3TC/EFV">AZT/3TC/EFV</option>
              <option value="ABC/3TC/DTG">ABC/3TC/DTG</option>
              <option value="ABC/3TC/EFV">ABC/3TC/EFV</option>
              <option value="other">Other</option>
            </select>
          </div>
          {artRegimen === 'other' && (
            <div>
              <Label>Specify Regimen</Label>
              <Input value={artRegimenOther} onChange={e => setArtRegimenOther(e.target.value)} placeholder="Enter regimen name" required />
            </div>
          )}
          <div>
            <Label>WHO Clinical Stage</Label>
            <select
              value={whoStage}
              onChange={e => setWhoStage(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select stage</option>
              <option value="1">Stage 1</option>
              <option value="2">Stage 2</option>
              <option value="3">Stage 3</option>
              <option value="4">Stage 4</option>
            </select>
          </div>
          <div>
            <Label>ART Refill Interval</Label>
            <select
              value={hivRefillInterval}
              onChange={e => setHivRefillInterval(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="30">30 days (Monthly)</option>
              <option value="60">60 days (Bi-monthly)</option>
              <option value="90">90 days (Quarterly)</option>
            </select>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold text-foreground mb-2">Latest CD4 Count</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>CD4 Count (cells/µL)</Label>
                <Input type="number" value={cd4Count} onChange={e => setCd4Count(e.target.value)} placeholder="e.g. 350" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={cd4Date} onChange={e => setCd4Date(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold text-foreground mb-2">Latest Viral Load</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Copies/mL</Label>
                <Input type="number" value={lastVLCopies} onChange={e => setLastVLCopies(e.target.value)} placeholder="e.g. 40" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={lastVLDate} onChange={e => setLastVLDate(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{'<'}50 copies/mL = Suppressed</p>
          </div>
        </>
      )}


      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">Save</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
