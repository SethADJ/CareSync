export type ProgramType = 'tbcare' | 'hivcare' | 'epi' | 'anc';

export type ARTRegimen = 'TDF/3TC/DTG' | 'TDF/3TC/EFV' | 'AZT/3TC/NVP' | 'AZT/3TC/EFV' | 'ABC/3TC/DTG' | 'ABC/3TC/EFV' | 'other';
export type WHOStage = '1' | '2' | '3' | '4';
export type ViralLoadStatus = 'suppressed' | 'unsuppressed' | 'pending';

export interface ViralLoadResult {
  date: string; // ISO
  copies: number; // copies/mL — <50 = suppressed
  status: ViralLoadStatus;
}

export interface RefillPickup {
  refillNumber: number;
  scheduledDate: string; // ISO
  pickedUp: boolean;
  pickupDate?: string; // ISO — actual pickup date
}

export interface Patient {
  id: string;
  systemId?: string;
  name: string;
  sex?: 'male' | 'female';
  phone: string;
  program: ProgramType;
  dateRegistered: string;
  facility?: string;
  // TB fields
  tbStartDate?: string;
  tbCurrentCycle?: number;
  tbType?: 'pulmonary-positive' | 'pulmonary-negative' | 'extra-pulmonary' | 'mdr';
  tbExtraPulmonarySite?: string;
  tbAttendance?: Record<number, 'showed' | 'missed'>;
  tbRescheduledDate?: string;
  // HIV fields
  artStartDate?: string;
  artRegimen?: ARTRegimen;
  artRegimenOther?: string;
  whoStage?: WHOStage;
  cd4Count?: number;
  cd4Date?: string;
  lastViralLoadDate?: string;
  lastViralLoadCopies?: number;
  viralLoadHistory?: ViralLoadResult[];
  hivRefillInterval?: 30 | 60 | 90; // days between ART refills
  refillPickups?: RefillPickup[]; // treatment adherence tracking
  hivCurrentRefill?: number; // current refill cycle number
  hivAttendance?: Record<number, 'showed' | 'missed'>; // refill attendance tracking
  hivRescheduledDate?: string; // rescheduled refill date
  // EPI fields
  epiStartDate?: string;
  epiVaccines?: string[];
  epiNextDueDate?: string;
  // ANC fields
  ancStartDate?: string;
  ancGestationalAge?: number;
  ancNextVisitDate?: string;
  // Common
  dateOfBirth?: string;
  location?: string;
  nextDueDate?: string;
  status?: 'ok' | 'due' | 'overdue' | 'completed';
  notes?: string;
}

export interface TrackingLog {
  id: string;
  patientId: string;
  program: ProgramType;
  date: string; // ISO
  action: 'follow-up-call' | 'no-show' | 'refill-pickup' | 'other';
  reason?: string;
}

export interface LicenseInfo {
  key: string;
  activatedAt: string;
  modules: string[];
}

// Simple localStorage-based database for offline-first usage
const PATIENTS_KEY_PREFIX = 'caresync_patients_';
const LICENSE_KEY = 'caresync_license';
const LOGS_KEY = 'caresync_logs';

function getPatientsKey(program: ProgramType) {
  return PATIENTS_KEY_PREFIX + program;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export const db = {
  getPatients(program: ProgramType): Patient[] {
    try {
      return JSON.parse(localStorage.getItem(getPatientsKey(program)) || '[]');
    } catch { return []; }
  },

  savePatients(program: ProgramType, patients: Patient[]) {
    localStorage.setItem(getPatientsKey(program), JSON.stringify(patients));
  },

  addPatient(patient: Omit<Patient, 'id'>): Patient {
    const patients = this.getPatients(patient.program);
    const newPatient = { ...patient, id: generateId() } as Patient;
    patients.push(newPatient);
    this.savePatients(patient.program, patients);
    return newPatient;
  },

  updatePatient(id: string, changes: Partial<Patient>): Patient | null {
    if (!changes.program) throw new Error('Program is required to update patient');
    const patients = this.getPatients(changes.program);
    const idx = patients.findIndex(p => p.id === id);
    if (idx === -1) return null;
    patients[idx] = { ...patients[idx], ...changes };
    this.savePatients(changes.program, patients);
    return patients[idx];
  },

  deletePatient(id: string, program: ProgramType) {
    const patients = this.getPatients(program).filter(p => p.id !== id);
    this.savePatients(program, patients);
  },

  // logs
  getLogs(): TrackingLog[] {
    try {
      return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    } catch {
      return [];
    }
  },

  saveLogs(logs: TrackingLog[]) {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  },

  addLog(log: Omit<TrackingLog, 'id'>): TrackingLog {
    const logs = this.getLogs();
    const newLog = { ...log, id: generateId() } as TrackingLog;
    logs.push(newLog);
    this.saveLogs(logs);
    return newLog;
  },

  getLicense(): LicenseInfo | null {
    try {
      const data = localStorage.getItem(LICENSE_KEY);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  saveLicense(license: LicenseInfo) {
    localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
  },

  clearLicense() {
    localStorage.removeItem(LICENSE_KEY);
  },
};
