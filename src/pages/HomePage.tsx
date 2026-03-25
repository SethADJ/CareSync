import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AuthBackground } from '@/components/AuthBackground';
import { isUserRegistered, isLoggedIn } from '@/pages/SignupPage';
import { TrendingDown, Bell, BarChart3, ClipboardList } from 'lucide-react';
import { Logo } from '@/components/Logo';

const features = [
  {
    icon: TrendingDown,
    title: 'Reduce Defaulter Rates',
    description: 'Track and manage patient adherence in real-time'
  },
  {
    icon: Bell,
    title: 'Automated Reminders',
    description: 'Notify caregivers of refill, review & visit dates'
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Detailed defaulter & adherence insights'
  },
  {
    icon: ClipboardList,
    title: 'Tracing Logs',
    description: 'Automated defaulter tracing records'
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  const registered = isUserRegistered();
  const loggedIn = isLoggedIn();

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // if the user is already registered and logged in redirect to welcome
  // if (registered && loggedIn) {
  //   return <Navigate to="/welcome" replace />;
  // }

  return (
    <AuthBackground>
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          {/* Main Content */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="mb-6 flex justify-center"
            >
              <Logo className="h-52 w-52 drop-shadow-xl" />
            </motion.div>
            <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Welcome to CareSync
            </h1>
            <p className="text-muted-foreground mb-8 text-base leading-relaxed">
              Empowering healthcare providers with intelligent adherence tracking and automated defaulter management.
            </p>
          </div>

          {/* Auth Buttons + Carousel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex flex-col gap-3 mb-12 max-w-md mx-auto"
          >
            {registered && loggedIn ? (
              <Button className="w-full py-6 text-base font-semibold" onClick={() => navigate('/welcome')}>
                Continue to Dashboard
              </Button>
            ) : (
              <>
                <Button className="w-full py-6 text-base font-semibold" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <Button variant="outline" className="w-full py-6 text-base font-semibold" onClick={() => navigate('/signup')}>
                  Create account
                </Button>
              </>
            )}

            {/* Features Carousel nested inside same width container */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="relative w-full h-14 mt-4"
            >
              <AnimatePresence mode="wait">
                {features.map((feature, idx) => {
                  const Icon = feature.icon;
                  if (idx !== activeFeature) return null;
                  
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.3, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: -300 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="w-full absolute rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-2 transition-all hover:border-primary/40"
                    >
                      <div className="flex gap-2 items-center h-10">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                          className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"
                        >
                          <Icon className="h-4 w-4 text-primary" />
                        </motion.div>
                        <div className="text-left flex-1 min-w-0">
                          <motion.h3
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="font-semibold text-sm text-foreground"
                          >
                            {feature.title}
                          </motion.h3>
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            className="text-xs text-muted-foreground mt-0.5"
                          >
                            {feature.description}
                          </motion.p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {/* Feature Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-2 justify-center mt-2"
            >
              {features.map((_, idx) => (
                <motion.div
                  key={idx}
                  animate={{
                    width: activeFeature === idx ? 24 : 8,
                    opacity: activeFeature === idx ? 1 : 0.4
                  }}
                  transition={{ duration: 0.3 }}
                  className="h-2 rounded-full bg-primary"
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </AuthBackground>
  );
}
