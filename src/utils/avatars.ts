// Healthcare professional avatar options

export interface AvatarOption {
  id: string;
  name: string;
  initials: string;
  color: string;
  bgClass: string;
  icon: string; // emoji or description
  role: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'doctor-1',
    name: 'Dr. Smith',
    initials: 'DS',
    color: '#3B82F6',
    bgClass: 'bg-blue-500',
    icon: '👨‍⚕️',
    role: 'Doctor',
  },
  {
    id: 'doctor-2',
    name: 'Dr. Johnson',
    initials: 'DJ',
    color: '#10B981',
    bgClass: 'bg-emerald-500',
    icon: '👩‍⚕️',
    role: 'Doctor',
  },
  {
    id: 'doctor-3',
    name: 'Dr. Chen',
    initials: 'DC',
    color: '#F59E0B',
    bgClass: 'bg-amber-500',
    icon: '👨‍⚕️',
    role: 'Doctor',
  },
  {
    id: 'nurse-1',
    name: 'Nurse Maria',
    initials: 'NM',
    color: '#EC4899',
    bgClass: 'bg-pink-500',
    icon: '👩‍⚕️',
    role: 'Nurse',
  },
  {
    id: 'nurse-2',
    name: 'Nurse James',
    initials: 'NJ',
    color: '#8B5CF6',
    bgClass: 'bg-violet-500',
    icon: '👨‍⚕️',
    role: 'Nurse',
  },
  {
    id: 'nurse-3',
    name: 'Nurse Sarah',
    initials: 'NS',
    color: '#06B6D4',
    bgClass: 'bg-cyan-500',
    icon: '👩‍⚕️',
    role: 'Nurse',
  },
  {
    id: 'midwife-1',
    name: 'Midwife Linda',
    initials: 'ML',
    color: '#DC2626',
    bgClass: 'bg-red-600',
    icon: '👩‍⚕️',
    role: 'Midwife',
  },
  {
    id: 'health-worker-1',
    name: 'Health Worker',
    initials: 'HW',
    color: '#059669',
    bgClass: 'bg-green-600',
    icon: '👨‍⚕️',
    role: 'Health Worker',
  },
  {
    id: 'counselor-1',
    name: 'Counselor Alex',
    initials: 'CA',
    color: '#7C3AED',
    bgClass: 'bg-purple-600',
    icon: '👩‍⚕️',
    role: 'Counselor',
  },
  {
    id: 'lab-tech-1',
    name: 'Lab Tech David',
    initials: 'LT',
    color: '#E11D48',
    bgClass: 'bg-rose-600',
    icon: '👨‍⚕️',
    role: 'Lab Technician',
  },
  {
    id: 'pharmacist-1',
    name: 'Pharmacist Emma',
    initials: 'PE',
    color: '#0891B2',
    bgClass: 'bg-cyan-600',
    icon: '👩‍⚕️',
    role: 'Pharmacist',
  },
  {
    id: 'admin-1',
    name: 'Admin Officer',
    initials: 'AO',
    color: '#6366F1',
    bgClass: 'bg-indigo-600',
    icon: '👨‍⚕️',
    role: 'Administrator',
  },
];

export function getAvatarById(id: string): AvatarOption | undefined {
  return AVATAR_OPTIONS.find(avatar => avatar.id === id);
}

export function getDefaultAvatar(): AvatarOption {
  return AVATAR_OPTIONS[0];
}
