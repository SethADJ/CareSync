import iconTbcare from '@/assets/TB.jpg';
import iconHivcare from '@/assets/HIV.jpg';
import iconEpi from '@/assets/EPI.jpg';
import iconAnc from '@/assets/ANC.jpg';

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

  return (
    <div className={`${className} rounded-lg shadow-sm overflow-hidden bg-white/5 backdrop-blur-sm flex items-center justify-center`}>
      <img 
        src={icon} 
        alt={program} 
        className="w-full h-full object-cover"
      />
    </div>
  );
}
