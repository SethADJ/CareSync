import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Edit2, Trash2, Phone } from 'lucide-react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onCall?: () => void;
  className?: string;
}

export function SwipeableRow({ children, onEdit, onDelete, onCall, className = '' }: SwipeableRowProps) {
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
  const x = useMotionValue(0);
  const constraintRef = useRef<HTMLDivElement>(null);

  // Background opacity based on drag
  const leftBg = useTransform(x, [-120, -60, 0], [1, 0.5, 0]);
  const rightBg = useTransform(x, [0, 60, 120], [0, 0.5, 1]);

  const handleDragEnd = (_: never, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x < -threshold) {
      setIsOpen('left'); // swiped left → show right actions (delete)
    } else if (info.offset.x > threshold) {
      setIsOpen('right'); // swiped right → show left actions (edit)
    } else {
      setIsOpen(null);
    }
  };

  const handleActionClick = (action: () => void) => {
    action();
    setIsOpen(null);
  };

  return (
    <div ref={constraintRef} className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Left action (edit) - revealed on swipe right */}
      <motion.div
        className="absolute inset-y-0 left-0 flex items-center gap-2 px-4"
        style={{ opacity: rightBg }}
      >
        {onEdit && (
          <button
            onClick={() => handleActionClick(onEdit)}
            className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
        {onCall && (
          <button
            onClick={() => handleActionClick(onCall)}
            className="h-9 w-9 rounded-full bg-success flex items-center justify-center text-primary-foreground shadow-md"
          >
            <Phone className="h-4 w-4" />
          </button>
        )}
      </motion.div>

      {/* Right action (delete) - revealed on swipe left */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center px-4"
        style={{ opacity: leftBg }}
      >
        {onDelete && (
          <button
            onClick={() => handleActionClick(onDelete)}
            className="h-9 w-9 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground shadow-md"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </motion.div>

      {/* Main content - draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: isOpen === 'left' ? -80 : isOpen === 'right' ? 80 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative z-10 bg-card"
        onClick={() => isOpen && setIsOpen(null)}
      >
        {children}
      </motion.div>
    </div>
  );
}
