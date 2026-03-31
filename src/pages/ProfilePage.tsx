import { useState, useRef } from 'react';
import { getUserProfile } from '@/pages/SignupPage';
import { getAvatarDataUrl, getDefaultAvatarDataUrl, getInitials, AVATAR_COLORS, AVATAR_ICON_OPTIONS, getAvatarIcon, getStoredAvatar, AVATAR_ICON_KEY, AVATAR_COLOR_KEY } from '@/utils/avatar';
import { AVATAR_OPTIONS } from '@/utils/avatars';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Mail, Building2, Globe, Save, Pencil, CheckCircle, LogOut, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const USER_KEY = 'caresync_user_profile';
const AVATAR_KEY = 'caresync_avatar';

export default function ProfilePage() {
  const navigate = useNavigate();
  const saved = getUserProfile();
  const [editing, setEditing] = useState(false);
  const storedAvatar = getStoredAvatar();
  
  // Get the selected avatar from stored ID or from localStorage icon
  const storedAvatarId = localStorage.getItem('caresync_avatar_id');
  const selectedAvatarOption = storedAvatarId ? AVATAR_OPTIONS.find(a => a.id === storedAvatarId) : null;
  const fallbackAvatarEmoji = selectedAvatarOption?.icon || (storedAvatar.type === 'icon' ? storedAvatar.src : '👨‍⚕️');
  
  const [avatar, setAvatar] = useState<string | null>(() => storedAvatar.type === 'image' ? storedAvatar.src ?? null : null);
  const [selectedIcon, setSelectedIcon] = useState(storedAvatar.icon || AVATAR_ICON_OPTIONS[0].id);
  const [selectedColor, setSelectedColor] = useState(selectedAvatarOption?.color || storedAvatar.color || AVATAR_COLORS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(saved || {
    firstName: '', otherNames: '', age: '', sex: '', phone: '', email: '', healthFacility: '', country: '', termsAccepted: false, privacyAccepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initials = getInitials(profile.firstName, profile.otherNames);
  const defaultAvatar = getDefaultAvatarDataUrl(initials);
  const AvatarIcon = getAvatarIcon(selectedIcon);

  const update = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!profile.firstName.trim()) e.firstName = 'Required';
    if (!profile.age.trim() || isNaN(Number(profile.age)) || Number(profile.age) < 18 || Number(profile.age) > 100) e.age = 'Valid age (18-100)';
    if (!profile.sex) e.sex = 'Required';
    if (!profile.phone.trim()) e.phone = 'Required';
    if (!profile.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) e.email = 'Valid email required';
    if (!profile.healthFacility.trim()) e.healthFacility = 'Required';
    if (!profile.country.trim()) e.country = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    localStorage.setItem('caresync_username', profile.firstName);
    setEditing(false);
    toast({ title: 'Profile updated', description: 'Your details have been saved.' });
  };

  const handleLogout = () => {
    localStorage.removeItem('caresync_logged_in');
    navigate('/login');
  };

  const handleClearAllData = () => {
    if (!window.confirm('⚠️ This will delete ALL patients, logs, and appointment data. This action cannot be undone.\n\nAre you sure?')) {
      return;
    }
    // Clear all program patient data
    localStorage.removeItem('patients_tbcare');
    localStorage.removeItem('patients_hivcare');
    localStorage.removeItem('patients_epi');
    localStorage.removeItem('patients_anc');
    // Clear logs
    localStorage.removeItem('logs');
    // Clear appointments/reminders
    localStorage.removeItem('reminders');
    localStorage.removeItem('appointments');
    // Hard refresh the page to reload with empty data
    window.location.href = '/';
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please choose an image under 2MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem(AVATAR_KEY, dataUrl);
      setAvatar(dataUrl);
      toast({ title: 'Avatar updated' });
    };
    reader.readAsDataURL(file);
  };

  const resetAvatarToDefault = () => {
    localStorage.removeItem(AVATAR_KEY);
    localStorage.setItem(AVATAR_ICON_KEY, selectedIcon);
    localStorage.setItem(AVATAR_COLOR_KEY, selectedColor);
    setAvatar(null);
    toast({ title: 'Avatar reset', description: 'Using default avatar icon.' });
  };


  const Field = ({ label, field, icon: Icon, type = 'text', placeholder = '' }: { label: string; field: string; icon: React.ElementType; type?: string; placeholder?: string }) => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        <div className="relative">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={type}
            value={(profile as any)[field]}
            onChange={e => update(field, e.target.value)}
            placeholder={placeholder}
            className="pl-9"
          />
          {errors[field] && <p className="text-xs text-destructive mt-1">{errors[field]}</p>}
        </div>
      ) : (
        <p className="text-sm font-medium text-foreground flex items-center gap-2 py-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {(profile as any)[field] || '—'}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            My Profile
          </h2>
          <p className="text-muted-foreground">View and manage your account details</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        )}
      </div>

      {/* Avatar (view only) */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-4 border-primary/20" style={{ backgroundColor: selectedColor }}>
            {avatar ? (
              <AvatarImage src={avatar} alt="Profile" />
            ) : (
              <AvatarFallback className="text-3xl font-bold flex items-center justify-center">
                {fallbackAvatarEmoji}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
        <p className="text-sm font-semibold text-foreground">{profile.firstName} {profile.otherNames}</p>
        <p className="text-xs text-muted-foreground">{profile.healthFacility}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" field="firstName" icon={User} placeholder="First name" />
            <Field label="Other Names" field="otherNames" icon={User} placeholder="Other names" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {editing ? (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Age</Label>
                  <Input type="number" value={profile.age} onChange={e => update('age', e.target.value)} placeholder="Age" min={18} max={100} />
                  {errors.age && <p className="text-xs text-destructive mt-1">{errors.age}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sex</Label>
                  <Select value={profile.sex} onValueChange={v => update('sex', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.sex && <p className="text-xs text-destructive mt-1">{errors.sex}</p>}
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Age</Label>
                  <p className="text-sm font-medium text-foreground py-2">{profile.age || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sex</Label>
                  <p className="text-sm font-medium text-foreground py-2 capitalize">{profile.sex || '—'}</p>
                </div>
              </>
            )}
          </div>
          <Field label="Phone Number" field="phone" icon={Phone} placeholder="+1234567890" />
          <Field label="Email Address" field="email" icon={Mail} type="email" placeholder="you@email.com" />
          <Field label="Health Facility" field="healthFacility" icon={Building2} placeholder="Facility name" />
          <Field label="Country" field="country" icon={Globe} placeholder="Country" />

          {editing && (
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setEditing(false); setProfile(saved!); setErrors({}); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-1" /> Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Terms & Privacy accepted</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleClearAllData} className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-initial">
              Clear Data
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout} className="flex-1 sm:flex-initial">
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
