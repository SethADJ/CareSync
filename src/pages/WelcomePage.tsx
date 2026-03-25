import { useState } from 'react';
import { ArrowRight, Construction, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getUserProfile } from '@/pages/SignupPage';
import { getStoredAvatar, getAvatarIcon } from '@/utils/avatar';
import { ProgramIcon } from '@/components/ProgramIcon';

const programs = [
  { key: 'tbcare', label: 'TBCare', description: 'TB treatment tracking & DOTS cycle monitoring', gradient: 'from-primary to-primary/60', locked: false },
  { key: 'hivcare', label: 'HIVCare', description: 'ART adherence & viral load follow-up', gradient: 'from-destructive to-destructive/60', locked: false },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 100, damping: 14 } },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const userProfile = getUserProfile();
  const userName = userProfile?.username || userProfile?.firstName || 'User';
  const initials = `${userProfile?.firstName?.[0] || ''}${userProfile?.otherNames?.[0] || ''}`.toUpperCase();

  const storedAvatar = getStoredAvatar();
  const AvatarIcon = getAvatarIcon(storedAvatar.icon || 'User');

  const [showDevDialog, setShowDevDialog] = useState(false);
  const [selectedLocked, setSelectedLocked] = useState('');

  const handleProgramClick = (prog: typeof programs[0]) => {
    if (prog.locked) {
      setSelectedLocked(prog.label);
      setShowDevDialog(true);
    } else {
      navigate(`/${prog.key}/dashboard`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background bg-grain relative overflow-hidden">
      <div className="absolute inset-0 bg-texture pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.06, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-accent blur-3xl"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 15, delay: 0.1 }}
          className="mb-5 relative"
        >
          <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-xl ring-4 ring-primary/5" style={{ backgroundColor: storedAvatar.color }}>
            {storedAvatar.type === 'image' ? (
              <AvatarImage src={storedAvatar.src || undefined} alt={userName} />
            ) : (
              <AvatarFallback className="text-primary-foreground text-2xl font-bold">
                <AvatarIcon className="h-10 w-10" />
              </AvatarFallback>
            )}
          </Avatar>
        </motion.div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="text-center mb-8 max-w-md"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-1.5">
            {getGreeting()}, <span className="text-primary">{userName}</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
            Welcome back to CareSync. Select a program to continue.
          </p>
        </motion.div>

        {/* Program Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg"
        >
          {programs.map((prog) => (
            <motion.div key={prog.key} variants={itemVariants}>
              <Card
                className={`group cursor-pointer border border-border/50 transition-all duration-300 bg-card/80 backdrop-blur-sm relative
                  ${prog.locked
                    ? 'hover:border-muted-foreground/30 hover:shadow-lg opacity-80'
                    : 'hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5'
                  }`}
                onClick={() => handleProgramClick(prog)}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${prog.gradient} shadow-md relative p-2`}>
                    <ProgramIcon
                      program={prog.key}
                      className="h-8 w-8 brightness-0 invert"
                    />
                    {prog.locked && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-muted-foreground flex items-center justify-center">
                        <Lock className="h-2.5 w-2.5 text-background" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm">{prog.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{prog.description}</p>
                  </div>
                  {prog.locked ? (
                    <Lock className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 shrink-0" />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-xs text-muted-foreground/50"
        >
          Select a program to begin
        </motion.p>
      </div>

      {/* Under Development Dialog */}
      <Dialog open={showDevDialog} onOpenChange={setShowDevDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center items-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 150, damping: 12 }}
              className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-2"
            >
              <Construction className="h-8 w-8 text-warning" />
            </motion.div>
            <DialogTitle className="text-xl"> Development</DialogTitle>
            <DialogDescription className="text-center">
              <span className="font-semibold text-foreground">{selectedLocked}</span> module is currently under development and will be available in a future update. Stay tuned!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-2">
            <Button onClick={() => setShowDevDialog(false)} variant="outline">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
