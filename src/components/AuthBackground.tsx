import { motion } from 'framer-motion';
import {
  ShieldCheck, HeartPulse, Syringe, PersonStanding, Pill, Thermometer,
  Baby, Droplets, Microscope, Clipboard, FileHeart,
} from 'lucide-react';

const floatingIcons = [
  { Icon: ShieldCheck, color: 'text-primary/20', size: 28, x: '8%', delay: 0, duration: 14 },
  { Icon: HeartPulse, color: 'text-destructive/20', size: 32, x: '18%', delay: 1.5, duration: 12 },
  { Icon: Syringe, color: 'text-accent/25', size: 24, x: '30%', delay: 3, duration: 16 },
  { Icon: Pill, color: 'text-warning/20', size: 22, x: '55%', delay: 2.5, duration: 15 },
  { Icon: Thermometer, color: 'text-destructive/15', size: 26, x: '65%', delay: 4, duration: 11 },
  { Icon: Baby, color: 'text-accent/20', size: 30, x: '75%', delay: 1, duration: 17 },
  { Icon: Droplets, color: 'text-primary/20', size: 20, x: '85%', delay: 3.5, duration: 14 },
  { Icon: Microscope, color: 'text-warning/15', size: 34, x: '12%', delay: 5, duration: 12 },
  { Icon: Clipboard, color: 'text-accent/15', size: 28, x: '50%', delay: 6, duration: 16 },
  { Icon: FileHeart, color: 'text-destructive/20', size: 24, x: '92%', delay: 2, duration: 13 },
  { Icon: PersonStanding, color: 'text-warning/25', size: 26, x: '38%', delay: 7, duration: 15 },
];

export function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background bg-grain relative overflow-hidden">
      {/* Floating medical icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons.map((item, i) => (
          <motion.div
            key={i}
            className={`absolute ${item.color}`}
            style={{ left: item.x }}
            initial={{ y: '-10%', opacity: 0, rotate: -20 }}
            animate={{
              y: ['-10%', '110vh'],
              opacity: [0, 0.8, 0.8, 0],
              rotate: [-20, 20, -15, 10],
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <item.Icon size={item.size} strokeWidth={1.5} />
          </motion.div>
        ))}
      </div>

      {/* Decorative gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full bg-accent/[0.05] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-warning/[0.03] blur-3xl" />
      </div>

      {children}

    </div>
  );
}
