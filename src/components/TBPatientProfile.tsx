import type { Patient } from '@/db/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, addDays, parseISO } from 'date-fns';
import { CalendarDays, User, MapPin, Building2, Phone, HeartPulse } from 'lucide-react';

interface TBPatientProfileProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getProfileSchedule(startDate: string, rescheduledDate?: string, currentCycle?: number) {
  const start = parseISO(startDate);
  const rescheduleBase = rescheduledDate ? parseISO(rescheduledDate) : null;
  const rescheduleCycle = currentCycle ?? 1;

  return Array.from({ length: 6 }, (_, i) => {
    const cycle = i + 1;
    let date: Date;
    const rescheduled = rescheduleBase && cycle >= rescheduleCycle;

    if (rescheduled) {
      date = addDays(rescheduleBase, (cycle - rescheduleCycle) * 28);
    } else {
      date = addDays(start, cycle * 28);
    }

    return { cycle, date, label: `Month ${cycle}`, rescheduled: !!rescheduled };
  });
}

const TB_TYPE_LABELS: Record<string, string> = {
  'pulmonary': 'Pulmonary TB',
  'extra-pulmonary': 'Extra-Pulmonary TB',
  'mdr': 'MDR-TB',
  'xdr': 'XDR-TB',
};

export default function TBPatientProfile({ patient, open, onOpenChange }: TBPatientProfileProps) {
  if (!patient) return null;

  const schedule = patient.tbStartDate ? getProfileSchedule(patient.tbStartDate, patient.tbRescheduledDate, patient.tbCurrentCycle) : [];
  const today = new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Patient Profile
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

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium text-foreground">{patient.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Sex</p>
                <p className="text-sm font-medium text-foreground capitalize">{patient.sex || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium text-foreground">{patient.phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Health Facility</p>
                <p className="text-sm font-medium text-foreground">{patient.facility || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Residential Location</p>
                <p className="text-sm font-medium text-foreground">{patient.location || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Type of TB</p>
                <p className="text-sm font-medium text-foreground">
                  {patient.tbType ? TB_TYPE_LABELS[patient.tbType] : '—'}
                  {patient.tbType === 'extra-pulmonary' && patient.tbExtraPulmonarySite && (
                    <span className="text-muted-foreground"> ({patient.tbExtraPulmonarySite})</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Treatment Start */}
          {patient.tbStartDate && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-1">Treatment Start Date</p>
              <p className="text-sm font-medium text-foreground">
                {format(parseISO(patient.tbStartDate), 'dd MMMM yyyy')}
              </p>
            </div>
          )}

          {/* 6-Month Schedule */}
          {schedule.length > 0 && (
            <div className="border-t border-border pt-3">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                6-Month Treatment Schedule
              </h4>
              <div className="space-y-2">
                {schedule.map((s) => {
                  const attendance = patient.tbAttendance?.[s.cycle];
                  const isPast = s.date < today;
                  return (
                    <div
                      key={s.cycle}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          attendance === 'showed'
                            ? 'bg-green-500/20 text-green-600'
                            : attendance === 'missed'
                            ? 'bg-red-500/20 text-red-600'
                            : isPast
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {s.cycle}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(s.date, 'dd MMM yyyy')}
                            {s.rescheduled && (
                              <span className="ml-1 text-warning font-medium">(rescheduled)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {attendance === 'showed' && (
                        <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10">Showed</Badge>
                      )}
                      {attendance === 'missed' && (
                        <Badge variant="outline" className="text-red-600 border-red-600/30 bg-red-500/10">Missed</Badge>
                      )}
                      {!attendance && isPast && (
                        <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                      )}
                      {!attendance && !isPast && (
                        <Badge variant="outline" className="text-muted-foreground">Upcoming</Badge>
                      )}
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
