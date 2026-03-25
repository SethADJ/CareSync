import { Cat, Dog, Heart, HeartPulse, Hospital, Stethoscope, User, Users } from 'lucide-react';

export const AVATAR_COLORS = [
  '#6366F1', // indigo-500
  '#EC4899', // pink-500
  '#F97316', // orange-500
  '#22C55E', // green-500
  '#14B8A6', // teal-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#FACC15', // yellow-400
];

export const AVATAR_ICON_OPTIONS = [
  { id: 'User', label: 'User', Icon: User },
  { id: 'Users', label: 'Team', Icon: Users },
  { id: 'Stethoscope', label: 'Stethoscope', Icon: Stethoscope },
  { id: 'Heart', label: 'Heart', Icon: Heart },
  { id: 'HeartPulse', label: 'Pulse', Icon: HeartPulse },
  { id: 'Hospital', label: 'Hospital', Icon: Hospital },
  { id: 'Dog', label: 'Dog', Icon: Dog },
  { id: 'Cat', label: 'Cat', Icon: Cat },
];

export function getAvatarIcon(id: string) {
  return AVATAR_ICON_OPTIONS.find(opt => opt.id === id)?.Icon || User;
}

export function getInitials(firstName: string | undefined, otherNames: string | undefined) {
  const initials = `${firstName?.[0] || ''}${otherNames?.[0] || ''}`.trim().toUpperCase();
  return initials || 'U';
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAvatarColor(seed: string): string {
  const idx = hashString(seed) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export const AVATAR_STORAGE_KEY = 'caresync_avatar';
export const AVATAR_ICON_KEY = 'caresync_avatar_icon';
export const AVATAR_COLOR_KEY = 'caresync_avatar_color';

export function getDefaultAvatarDataUrl(initials: string, seed?: string): string {
  const bg = getAvatarColor(seed || initials);
  return getAvatarDataUrl(initials, bg);
}

export function getAvatarDataUrl(initials: string, background: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
      <rect width="100%" height="100%" fill="${background}" rx="24" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="56" fill="white" font-weight="700">${initials}</text>
    </svg>
  `;
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

export type StoredAvatar = {
  type: 'image' | 'icon';
  src?: string; // data URL for image
  icon?: string; // icon id
  color?: string; // background
};

export function getStoredAvatar(): StoredAvatar {
  const image = localStorage.getItem(AVATAR_STORAGE_KEY);
  const icon = localStorage.getItem(AVATAR_ICON_KEY);
  const color = localStorage.getItem(AVATAR_COLOR_KEY);

  if (image) {
    return { type: 'image', src: image, color };
  }

  if (icon) {
    return { type: 'icon', icon, color: color || AVATAR_COLORS[0] };
  }

  return { type: 'icon', icon: 'User', color: AVATAR_COLORS[0] };
}
