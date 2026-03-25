import { db, type Patient, type ProgramType } from '@/db/database';

const USER_KEY = 'caresync_user_profile';

const PROGRAM_PREFIX: Record<ProgramType, string> = {
  tbcare: 'TB',
  hivcare: 'HIV',
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('');
}

function getFacilityInitials(): string {
  try {
    const profile = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
    const facility = profile.healthFacility || '';
    return getInitials(facility) || 'XX';
  } catch {
    return 'XX';
  }
}

export function generateSystemId(patientName: string, program: ProgramType = 'tbcare'): string {
  const prefix = PROGRAM_PREFIX[program];
  const patientInitials = getInitials(patientName) || 'XX';
  const facilityInitials = getFacilityInitials();
  const year = new Date().getFullYear().toString().slice(-2);

  // Get next sequential number scoped to program + year
  const allPatients = db.getPatients(program);
  const idPrefix = `${prefix}/`;
  const existingNumbers = allPatients
    .filter(p => p.systemId?.startsWith(idPrefix) && p.systemId?.includes(`/${year}/`))
    .map(p => {
      const parts = p.systemId?.split('/');
      return parts ? parseInt(parts[parts.length - 1]) || 0 : 0;
    });

  const nextNum = (existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0) + 1;
  return `${prefix}/${patientInitials}/${facilityInitials}/${year}/${String(nextNum).padStart(3, '0')}`;
}
