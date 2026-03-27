import { addDays, parseISO, format, isToday, isBefore, startOfDay } from 'date-fns';
import type { Patient, ProgramType } from '@/db/database';

// TBCare: 28-day refill cycles, 6 cycles total
// Uses last refill date for next visit calculation and treatment start date for 6-month duration
export function calculateTBNextDue(patient: Patient): { nextDueDate: string; status: 'ok' | 'due' | 'overdue' | 'completed' } {
  if (!patient.tbStartDate) return { nextDueDate: '', status: 'ok' };
  
  // Check if treatment is complete (6 months from start date)
  const treatmentEndDate = addDays(parseISO(patient.tbStartDate), 6 * 28); // 6 cycles of 28 days
  const today = startOfDay(new Date());
  if (!isBefore(today, treatmentEndDate) && (patient.tbCurrentCycle ?? 1) >= 6) {
    return { nextDueDate: '', status: 'completed' };
  }

  // Use last refill date as base for next visit calculation
  const baseDate = patient.tbRescheduledDate
    ? parseISO(patient.tbRescheduledDate)
    : parseISO(patient.tbStartDate);

  // Next due is 28 days after last refill date
  const nextDue = addDays(baseDate, 28);

  return getStatus(nextDue);
}

// Generate 6-month TB schedule dates, accounting for rescheduled dates
export function getTBSchedule(startDate: string, rescheduledDate?: string, currentCycle?: number) {
  const start = parseISO(startDate);
  const rescheduleBase = rescheduledDate ? parseISO(rescheduledDate) : null;
  const rescheduleCycle = currentCycle ?? 1;

  return Array.from({ length: 6 }, (_, i) => {
    const cycle = i + 1;
    let date: Date;

    if (rescheduleBase && cycle >= rescheduleCycle) {
      // Shift remaining cycles from rescheduled date
      date = addDays(rescheduleBase, (cycle - rescheduleCycle) * 28);
    } else {
      date = addDays(start, cycle * 28);
    }

    return { cycle, date, label: `Month ${cycle}` };
  });
}

// HIVCare: configurable ART refill interval (30/60/90 days), 6-month viral load
export function calculateHIVNextDue(patient: Patient): { nextDueDate: string; status: 'ok' | 'due' | 'overdue' | 'completed' } {
  if (!patient.artStartDate) return { nextDueDate: '', status: 'ok' };
  const today = startOfDay(new Date());
  const refillInterval = patient.hivRefillInterval ?? 90;
  const cycle = patient.hivCurrentRefill ?? 1;

  // Use rescheduled date as base if available
  const baseDate = patient.hivRescheduledDate
    ? parseISO(patient.hivRescheduledDate)
    : parseISO(patient.artStartDate);

  const nextRefill = patient.hivRescheduledDate
    ? addDays(baseDate, (cycle - (patient.hivCurrentRefill ?? 1)) * refillInterval)
    : addDays(parseISO(patient.artStartDate), cycle * refillInterval);

  return getStatus(nextRefill);
}

export function getViralLoadStatus(patient: Patient): 'suppressed' | 'unsuppressed' | 'pending' | 'unknown' {
  const history = patient.viralLoadHistory;
  if (!history || history.length === 0) return 'unknown';
  const latest = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  return latest.copies < 50 ? 'suppressed' : 'unsuppressed';
}


function getStatus(dueDate: Date): { nextDueDate: string; status: 'ok' | 'due' | 'overdue' | 'completed' } {
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  const nextDueDate = format(due, 'yyyy-MM-dd');

  if (isToday(due)) return { nextDueDate, status: 'due' };
  if (isBefore(due, today)) return { nextDueDate, status: 'overdue' };
  return { nextDueDate, status: 'ok' };
}

export function calculateNextDue(patient: Patient): Patient {
  let result: { nextDueDate: string; status: 'ok' | 'due' | 'overdue' | 'completed' };

  switch (patient.program) {
    case 'tbcare': result = calculateTBNextDue(patient); break;
    case 'hivcare': result = calculateHIVNextDue(patient); break;
    default: result = { nextDueDate: '', status: 'ok' };
  }

  return { ...patient, nextDueDate: result.nextDueDate, status: result.status };
}

export function getProgramLabel(program: ProgramType): string {
  const labels: Record<ProgramType, string> = {
    tbcare: 'TBCare',
    hivcare: 'HIVCare',
    epi: 'EPI',
    anc: 'ANC',
  };
  return labels[program];
}

export function getProgramColor(program: ProgramType): string {
  const colors: Record<ProgramType, string> = {
    tbcare: 'bg-primary',
    hivcare: 'bg-accent',
    epi: 'bg-green-500',
    anc: 'bg-purple-500',
  };
  return colors[program];
}

export function generateWhatsAppLink(patient: Patient): string {
  const programLabel = getProgramLabel(patient.program);
  const dueDate = patient.nextDueDate ? format(parseISO(patient.nextDueDate), 'dd MMM yyyy') : 'your scheduled date';
  const message = `Hello, you missed your ${programLabel} appointment at the clinic on ${dueDate}. Please return today.`;
  const phone = patient.phone.replace(/[^0-9+]/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
