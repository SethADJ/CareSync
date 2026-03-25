import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AuthBackground } from '@/components/AuthBackground';
import { LogIn, UserPlus, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { isUserRegistered, getUserProfile } from '@/pages/SignupPage';

const PASSWORD_KEY = 'caresync_password';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const hasAccount = isUserRegistered();

  const handleLogin = () => {
    setError('');
    const profile = getUserProfile();
    const storedPassword = localStorage.getItem(PASSWORD_KEY);

    if (!profile) {
      setError('No account found. Please create an account first.');
      return;
    }

    if (!storedPassword) {
      setError('No password stored. Please recreate account.');
      return;
    }

    if (username.trim() !== profile.username) {
      setError('Username does not match the registered account.');
      return;
    }

    if (password !== storedPassword) {
      setError('Incorrect password. Please try again.');
      return;
    }

    // Mark as logged in
    localStorage.setItem('caresync_logged_in', 'true');
    navigate('/welcome');
  };

  return (
    <AuthBackground>
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 15 }}
              className="mx-auto mb-3"
            >
              <Logo className="h-24 w-24 mx-auto" />
            </motion.div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasAccount ? 'Welcome back! Sign in to continue.' : 'Get started by creating an account.'}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LogIn className="h-5 w-5 text-primary" />
                  Sign In
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasAccount && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">
                    <p>No account found on this device. Please create an account first.</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="username"
                    disabled={!hasAccount}
                  />
                </div>

                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter your password"
                      className="pl-9 pr-10"
                      disabled={!hasAccount}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive bg-destructive/10 rounded-lg p-2.5 text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <Button onClick={handleLogin} className="w-full" disabled={!hasAccount}>
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => navigate('/signup')}
                  className="w-full"
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Create Account
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </AuthBackground>
  );
}
