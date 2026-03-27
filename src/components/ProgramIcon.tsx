import iconTbcare from '@/assets/icon-tbcare.png';
import iconHivcare from '@/assets/icon-hivcare.png';
import iconEpi from '@/assets/icon-epi.png';
import iconAnc from '@/assets/icon-anc.png';

const programIcons: Record<string, string> = {
  tbcare: iconTbcare,
  hivcare: iconHivcare,
  epi: iconEpi,
  anc: iconAnc,
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
