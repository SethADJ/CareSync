import iconTbcare from '@/assets/icon-tbcare.png';
import iconHivcare from '@/assets/icon-hivcare.png';

const programIcons: Record<string, string> = {
  tbcare: iconTbcare,
  hivcare: iconHivcare,
};

interface ProgramIconProps {
  program: string;
  className?: string;
}

export function ProgramIcon({ program, className = 'h-6 w-6' }: ProgramIconProps) {
  const icon = programIcons[program];
  if (!icon) return null;

  return <img src={icon} alt={program} className={`${className} object-contain`} />;
}
