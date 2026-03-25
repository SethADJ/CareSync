import type { Patient, RefillPickup } from '@/db/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { User, MapPin, Building2, Phone, Pill, Activity, CalendarDays, CheckCircle, ClipboardCheck } from 'lucide-react';

interface HIVPatientProfileProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePatient?: (id: string, changes: Partial<Patient>) => void;
}

const REGIMEN_LABELS: Record<string, string> = {
  'TDF/3TC/DTG': 'TDF/3TC/DTG (1st Line)',
  'TDF/3TC/EFV': 'TDF/3TC/EFV (1st Line)',
  'AZT/3TC/NVP': 'AZT/3TC/NVP (1st Line)',
  'AZT/3TC/EFV': 'AZT/3TC/EFV (1st Line)',
  'ABC/3TC/DTG': 'ABC/3TC/DTG (2nd Line)',
  'ABC/3TC/EFV': 'ABC/3TC/EFV (2nd Line)',
  other: 'Other',
};

function calculateAdherenceScore(pickups: RefillPickup[]): number {
  if (!pickups || pickups.length === 0) return 0;
  const pickedUp = pickups.filter(p => p.pickedUp).length;
  return Math.round((pickedUp / pickups.length) * 100);
}

function getAdherenceColor(score: number): string {
  if (score >= 95) return 'text-green-600';
  if (score >= 80) return 'text-warning';
  return 'text-destructive';
}

function getAdherenceBadge(score: number): { label: string; className: string } {
  if (score >= 95) return { label: 'Excellent', className: 'text-green-600 border-green-600/30 bg-green-500/10' };
  if (score >= 80) return { label: 'Good', className: 'text-warning border-warning/30 bg-warning/10' };
  if (score >= 50) return { label: 'Fair', className: 'text-orange-600 border-orange-600/30 bg-orange-500/10' };
  return { label: 'Poor', className: 'text-destructive border-destructive/30 bg-destructive/10' };
}

export default function HIVPatientProfile({ patient, open, onOpenChange, onUpdatePatient }: HIVPatientProfileProps) {
  if (!patient) return null;

  const today = new Date();
  const refillInterval = patient.hivRefillInterval ?? 90;
  const artStart = patient.artStartDate ? parseISO(patient.artStartDate) : null;

  // Calculate refill schedule
  const refillSchedule = artStart ? (() => {
    const schedules = [];
    const daysSinceStart = differenceInDays(today, artStart);
    const completedRefills = Math.floor(daysSinceStart / refillInterval);
    const startFrom = Math.max(0, completedRefills - 1);
    for (let i = startFrom; i < startFrom + 6; i++) {
      const date = addDays(artStart, (i + 1) * refillInterval);
      schedules.push({ refill: i + 1, date });
    }
    return schedules;
  })() : [];

  // Viral load history
  const vlHistory = [...(patient.viralLoadHistory ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latestVL = vlHistory[0];
  const isSuppressed = latestVL ? latestVL.copies < 50 : undefined;

  // Next VL due (6 months from last)
  const nextVLDue = patient.lastViralLoadDate
    ? addDays(parseISO(patient.lastViralLoadDate), 180)
    : artStart
    ? addDays(artStart, 180)
    : null;

  // Adherence tracking
  const pickups = patient.refillPickups ?? [];
  const adherenceScore = calculateAdherenceScore(pickups);
  const adherenceBadge = getAdherenceBadge(adherenceScore);

  const handlePickupToggle = (refillNumber: number, scheduledDate: Date) => {
    if (!onUpdatePatient) return;
    const existing = [...pickups];
    const idx = existing.findIndex(p => p.refillNumber === refillNumber);
    if (idx >= 0) {
      existing[idx] = {
        ...existing[idx],
        pickedUp: !existing[idx].pickedUp,
        pickupDate: !existing[idx].pickedUp ? new Date().toISOString() : undefined,
      };
    } else {
      existing.push({
        refillNumber,
        scheduledDate: format(scheduledDate, 'yyyy-MM-dd'),
        pickedUp: true,
        pickupDate: new Date().toISOString(),
      });
    }
    onUpdatePatient(patient.id, { refillPickups: existing, program: patient.program });
  };

  const isPickedUp = (refillNumber: number) => pickups.find(p => p.refillNumber === refillNumber)?.pickedUp ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-destructive" />
            HIV Patient Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* System ID */}
          {patient.systemId && (
            <div className="bg-muted rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">System ID</p>
              <p className="font-mono font-bold text-foreground">{patient.systemId}</p>
            </div>
          )}

          {/* Adherence Score Card */}
          {pickups.length > 0 && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-destructive" />
                  Treatment Adherence
                </h4>
                <Badge variant="outline" className={adherenceBadge.className}>
                  {adherenceBadge.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold tabular-nums ${getAdherenceColor(adherenceScore)}`}>
                  {adherenceScore}%
                </span>
                <div className="flex-1">
                  <Progress value={adherenceScore} className="h-2.5" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {pickups.filter(p => p.pickedUp).length} of {pickups.length} refills collected
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium text-foreground truncate">{patient.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Sex</p>
                <p className="text-sm font-medium text-foreground capitalize">{patient.sex || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium text-foreground truncate">{patient.phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Health Facility</p>
                <p className="text-sm font-medium text-foreground truncate">{patient.facility || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium text-foreground truncate">{patient.location || '—'}</p>
              </div>
            </div>
          </div>

          {/* ART Details */}
          <div className="border-t border-border pt-3 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Pill className="h-4 w-4 text-destructive" />
              ART Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">ART Start Date</p>
                <p className="text-sm font-medium text-foreground">
                  {patient.artStartDate ? format(parseISO(patient.artStartDate), 'dd MMM yyyy') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ART Regimen</p>
                <p className="text-sm font-medium text-foreground">
                  {patient.artRegimen === 'other'
                    ? patient.artRegimenOther || 'Other'
                    : patient.artRegimen
                    ? REGIMEN_LABELS[patient.artRegimen] || patient.artRegimen
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">WHO Stage</p>
                <p className="text-sm font-medium text-foreground">
                  {patient.whoStage ? `Stage ${patient.whoStage}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Refill Interval</p>
                <p className="text-sm font-medium text-foreground">{refillInterval} days</p>
              </div>
            </div>
          </div>




          {/* ART Refill Schedule with Pickup Tracking */}
          {refillSchedule.length > 0 && (
            <div className="border-t border-border pt-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-destructive" />
                ART Refill Schedule ({refillInterval}-day intervals)
              </h4>
              <div className="space-y-2">
                {refillSchedule.map((s) => {
                  const isPast = s.date < today;
                  const isDue = differenceInDays(s.date, today) <= 3 && differenceInDays(s.date, today) >= 0;
                  const isOverdue = isPast;
                  const picked = isPickedUp(s.refill);
                  const attendance = patient.hivAttendance?.[s.refill];
                  return (
                    <div
                      key={s.refill}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                        attendance === 'showed'
                          ? 'border-green-600/30 bg-green-500/5'
                          : attendance === 'missed'
                          ? 'border-destructive/30 bg-destructive/5'
                          : picked
                          ? 'border-green-600/30 bg-green-500/5'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          attendance === 'showed'
                            ? 'bg-green-500/20 text-green-600'
                            : attendance === 'missed'
                            ? 'bg-destructive/20 text-destructive'
                            : picked
                            ? 'bg-green-500/20 text-green-600'
                            : isOverdue
                            ? 'bg-destructive/20 text-destructive'
                            : isDue
                            ? 'bg-warning/20 text-warning'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {attendance === 'showed' ? <CheckCircle className="h-4 w-4" /> : s.refill}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Refill #{s.refill}</p>
                          <p className="text-xs text-muted-foreground">{format(s.date, 'dd MMM yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {attendance === 'showed' && (
                          <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10">Showed</Badge>
                        )}
                        {attendance === 'missed' && (
                          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">Missed</Badge>
                        )}
                        {!attendance && picked && <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10">Collected</Badge>}
                        {!attendance && !picked && isOverdue && <Badge variant="outline" className="text-muted-foreground">Pending</Badge>}
                        {!attendance && !picked && isDue && !isOverdue && <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">Due Soon</Badge>}
                        {!attendance && !picked && !isPast && !isDue && <Badge variant="outline" className="text-muted-foreground">Upcoming</Badge>}
                        {onUpdatePatient && (isPast || isDue) && !attendance && (
                          <Button
                            size="sm"
                            variant={picked ? "outline" : "default"}
                            className={`h-7 text-xs ${picked ? '' : 'bg-green-600 hover:bg-green-700'}`}
                            onClick={() => handlePickupToggle(s.refill, s.date)}
                          >
                            {picked ? 'Undo' : 'Mark Collected'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
