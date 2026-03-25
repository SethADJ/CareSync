import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AuthBackground } from '@/components/AuthBackground';
import {
  ArrowRight, ArrowLeft, User, Phone, Mail, Building2, Globe, CheckCircle,
  KeyRound, Eye, EyeOff, LogIn,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { countries } from '@/utils/countries';

const USER_KEY = 'caresync_user_profile';

interface UserProfile {
  firstName: string;
  otherNames: string;
  age: string;
  sex: string;
  phone: string;
  email: string;
  healthFacility: string;
  country: string;
  username: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

const INITIAL_PROFILE: UserProfile = {
  firstName: '',
  otherNames: '',
  age: '',
  sex: '',
  phone: '',
  email: '',
  healthFacility: '',
  country: '',
  username: '',
  termsAccepted: false,
  privacyAccepted: false,
};

export function isUserRegistered(): boolean {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return false;
  try {
    const profile: UserProfile = JSON.parse(data);
    return profile.termsAccepted && profile.privacyAccepted && !!profile.username;
  } catch { return false; }
}

export function isLoggedIn(): boolean {
  return localStorage.getItem('caresync_logged_in') === 'true';
}

export function getUserProfile(): UserProfile | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=form, 2=credentials, 3=terms, 4=privacy
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const update = (field: keyof UserProfile, value: string | boolean) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // derived country/dialcode info
  const selectedCountry = countries.find(c => c.name === profile.country);
  const dialCode = selectedCountry?.dialCode || '';
  // keep raw phone (without dial code) for editing
  const phoneRaw = profile.phone.startsWith(dialCode) ? profile.phone.slice(dialCode.length) : profile.phone;

  const validateStep1 = (): boolean => {
    const e: Partial<Record<string, string>> = {};
    if (!profile.firstName.trim()) e.firstName = 'First name is required';
    if (!profile.age.trim() || isNaN(Number(profile.age)) || Number(profile.age) < 18 || Number(profile.age) > 100) e.age = 'Valid age (18-100) required';
    if (!profile.sex) e.sex = 'Select your sex';
    if (!profile.phone.trim()) e.phone = 'Phone number is required';
    if (!profile.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) e.email = 'Valid email required';
    else if (!profile.email.toLowerCase().endsWith('@gmail.com')) e.email = 'Gmail address required';
    if (!profile.healthFacility.trim()) e.healthFacility = 'Health facility is required';
    if (!profile.country.trim()) e.country = 'Country is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const validateCredentials = (): boolean => {
    const e: Partial<Record<string, string>> = {};
    if (!username.trim()) e.username = 'Choose a username';
    if (username.trim().length < 3) e.username = 'Username must be at least 3 characters';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== passwordConfirm) e.passwordConfirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateCredentials()) setStep(3);
    else if (step === 3 && profile.termsAccepted) setStep(4);
    else if (step === 4 && profile.privacyAccepted) {
      // finalize registration
      const storedProfile = { ...profile, username: username.trim() };
      localStorage.setItem(USER_KEY, JSON.stringify(storedProfile));
      localStorage.setItem('caresync_username', username.trim());
      localStorage.setItem('caresync_password', password);
      // Set default avatar
      localStorage.setItem('caresync_avatar_icon', 'User');
      localStorage.setItem('caresync_avatar_color', '#3B82F6');
      localStorage.setItem('caresync_logged_in', 'true');
      // Link Gmail for Google Drive backup
      if (profile.email) {
        localStorage.setItem('caresync_backup_gmail', profile.email);
      }
      navigate('/welcome');
    }
  };
  const totalSteps = 4;

  return (
    <AuthBackground>
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 15 }}
              className="mx-auto mb-3"
            >
              <Logo className="h-16 w-16 mx-auto rounded-2xl shadow-lg shadow-primary/25" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">
              Care<span className="text-primary">Sync</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Create your account</p>
<div className="flex items-center justify-center gap-2 mt-3">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
                <div key={s} className={`h-2 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-primary' : s < step ? 'w-8 bg-primary/40' : 'w-8 bg-muted'}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Step {step} of {totalSteps}: {step === 1 ? 'Your Details' : step === 2 ? 'Create Credentials' : step === 3 ? 'Terms & Conditions' : 'Data Protection & Privacy'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" value={profile.firstName} onChange={e => update('firstName', e.target.value)} placeholder="First name" />
                        {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
                      </div>
                      <div>
                        <Label htmlFor="otherNames">Other Names</Label>
                        <Input id="otherNames" value={profile.otherNames} onChange={e => update('otherNames', e.target.value)} placeholder="Other names" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="age">Age</Label>
                        <Input id="age" type="number" value={profile.age} onChange={e => update('age', e.target.value)} placeholder="Age" min={18} max={100} />
                        {errors.age && <p className="text-xs text-destructive mt-1">{errors.age}</p>}
                      </div>
                      <div>
                        <Label>Sex</Label>
                        <Select value={profile.sex} onValueChange={v => update('sex', v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.sex && <p className="text-xs text-destructive mt-1">{errors.sex}</p>}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="country">Country</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="country"
                          list="country-list"
                          value={profile.country}
                          onChange={e => {
                            const val = e.target.value;
                            update('country', val);
                            const c = countries.find(c => c.name === val);
                            if (c) update('phone', c.dialCode);
                          }}
                          placeholder="Start typing country"
                          className="pl-9"
                        />
                        <datalist id="country-list">
                          {countries.map(c => (
                            <option key={c.code} value={c.name}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number {dialCode && `(${dialCode})`}</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{dialCode}</span>
                        <Input
                          id="phone"
                          value={phoneRaw}
                          onChange={e => {
                            let v = e.target.value;
                            if (dialCode && v.startsWith(dialCode)) {
                              v = v.slice(dialCode.length);
                            }
                            update('phone', dialCode + v);
                          }}
                          placeholder={dialCode ? dialCode + '123456...' : '+1234567890'}
                          className="pl-20"
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" value={profile.email} onChange={e => update('email', e.target.value)} placeholder="you@gmail.com" className="pl-9" />
                      </div>
                      {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Gmail required for cloud backup. Ensure you are connected to the internet when completing registration.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="facility">Health Facility</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="facility" value={profile.healthFacility} onChange={e => update('healthFacility', e.target.value)} placeholder="Facility name" className="pl-9" />
                      </div>
                      {errors.healthFacility && <p className="text-xs text-destructive mt-1">{errors.healthFacility}</p>}
                    </div>

                    <Button onClick={handleNext} className="w-full">
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      Create Credentials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Choose a username and password (minimum 6 characters). After signup you'll use these to log in.
                    </p>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={e => { setUsername(e.target.value); setErrors(prev => ({ ...prev, username: undefined })); }}
                        placeholder="username"
                      />
                      {errors.username && <p className="text-xs text-destructive mt-1">{errors.username}</p>}
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })); }}
                          placeholder="Enter password"
                          className="pl-9 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                    </div>
                    <div>
                      <Label htmlFor="passwordConfirm">Confirm Password</Label>
                      <Input
                        id="passwordConfirm"
                        type={showPassword ? 'text' : 'password'}
                        value={passwordConfirm}
                        onChange={e => { setPasswordConfirm(e.target.value); setErrors(prev => ({ ...prev, passwordConfirm: undefined })); }}
                        placeholder="Re-enter password"
                      />
                      {errors.passwordConfirm && <p className="text-xs text-destructive mt-1">{errors.passwordConfirm}</p>}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <Button onClick={handleNext} className="flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Terms & Conditions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-3">
                      <h3 className="font-semibold text-foreground">1. Acceptance of Terms</h3>
                      <p>By accessing and using CareSync, you agree to be bound by these Terms and Conditions. CareSync is a clinical patient tracking tool designed for authorized healthcare professionals only.</p>
                      <h3 className="font-semibold text-foreground">2. Authorized Use</h3>
                      <p>You must be an authorized healthcare worker affiliated with a registered health facility to use this application.</p>
                      <h3 className="font-semibold text-foreground">3. Patient Data Responsibility</h3>
                      <p>You are solely responsible for the accuracy and completeness of patient data entered into CareSync.</p>
                      <h3 className="font-semibold text-foreground">4. Data Storage</h3>
                      <p>CareSync stores data locally on your device. You are responsible for maintaining backups and ensuring data security.</p>
                      <h3 className="font-semibold text-foreground">5. Clinical Decision Support</h3>
                      <p>CareSync provides scheduling and tracking functionality only. It does not provide medical advice or clinical decision support.</p>
                      <h3 className="font-semibold text-foreground">6. Limitation of Liability</h3>
                      <p>CareSync is provided "as is" without warranties of any kind.</p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                      <Checkbox id="terms" checked={profile.termsAccepted} onCheckedChange={(checked) => update('termsAccepted', !!checked)} />
                      <Label htmlFor="terms" className="text-sm leading-snug cursor-pointer">I have read and agree to the Terms & Conditions</Label>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(2)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <Button onClick={handleNext} disabled={!profile.termsAccepted} className="flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Data Protection & Privacy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-3">
                      <h3 className="font-semibold text-foreground">1. Data Collection</h3>
                      <p>CareSync collects personal information you provide during registration and patient data you enter during clinical use.</p>
                      <h3 className="font-semibold text-foreground">2. Purpose of Data Processing</h3>
                      <p>Your personal data is used solely for identifying you as an authorized user and customizing your application experience.</p>
                      <h3 className="font-semibold text-foreground">3. Data Storage & Security</h3>
                      <p>All data is stored locally on your device. No patient data is transmitted to external servers without your explicit consent.</p>
                      <h3 className="font-semibold text-foreground">4. Patient Confidentiality</h3>
                      <p>You must ensure that patient data remains confidential in accordance with your country's health data protection laws.</p>
                      <h3 className="font-semibold text-foreground">5. Data Sharing</h3>
                      <p>CareSync does not share, sell, or distribute your personal data or patient data to any third parties.</p>
                      <h3 className="font-semibold text-foreground">6. Your Rights</h3>
                      <p>You have the right to access, correct, delete, and export your data, and withdraw consent at any time.</p>
                      <h3 className="font-semibold text-foreground">7. Data Retention</h3>
                      <p>Your data is retained locally for as long as the application is installed. Upon account deletion, all data is permanently removed.</p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                      <Checkbox id="privacy" checked={profile.privacyAccepted} onCheckedChange={(checked) => update('privacyAccepted', !!checked)} />
                      <Label htmlFor="privacy" className="text-sm leading-snug cursor-pointer">I have read and agree to the Data Protection & Privacy Policy</Label>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(3)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <Button onClick={handleNext} disabled={!profile.privacyAccepted} className="flex-1"><CheckCircle className="mr-2 h-4 w-4" /> Complete Registration</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Link to login */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-4"
          >
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5" />
              Already have an account? <span className="font-semibold text-primary">Sign in</span>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </AuthBackground>
  );
}
