import { useState, useEffect } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { ProgramType } from '@/db/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Phone, Globe } from 'lucide-react';
import { countries, getPhoneConfig } from '@/utils/countries';
import { getUserProfile } from '@/pages/SignupPage';

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: ProgramType;
}

export default function AddPatientDialog({ open, onOpenChange, program }: AddPatientDialogProps) {
  const { addPatient } = usePatients(program);
  const userProfile = getUserProfile();
  const defaultCountry = userProfile?.country || 'South Africa';
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(defaultCountry);
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Update default country if user profile changes
    setCountry(defaultCountry);
  }, [open, defaultCountry]);

  const phoneConfig = getPhoneConfig(country);

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!country.trim()) {
      setError('Country is required');
      return;
    }
    if (!sex.trim()) {
      setError('Sex is required');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    if (phone.length !== phoneConfig?.digits) {
      setError(`Phone number must be ${phoneConfig?.digits} digits`);
      return;
    }
    
    setSaving(true);
    const fullPhone = phone ? `${phoneConfig?.dialCode}${phone}` : '';
    await addPatient({
      name: name.trim(),
      phone: fullPhone,
      sex: sex as 'male' | 'female',
      program,
      dateRegistered: new Date().toISOString(),
      status: 'ok',
    });
    setSaving(false);
    setName('');
    setPhone('');
    setCountry(defaultCountry);
    setSex('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Patient</DialogTitle>
          <DialogDescription>Enter the patient's details to add them to the program.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
          
          <div>
            <Label htmlFor="pat-country" className="text-xs text-muted-foreground">Country</Label>
            <Input
              id="pat-country"
              list="patient-country-list"
              value={country}
              onChange={e => {
                setCountry(e.target.value);
                setPhone(''); // Clear phone when country changes
              }}
              placeholder="Select country"
            />
            <datalist id="patient-country-list">
              {countries.map(c => (
                <option key={c.code} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <Label htmlFor="pat-phone" className="text-xs text-muted-foreground">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <div className="absolute left-8 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {phoneConfig?.dialCode || '+1'}
              </div>
              <Input
                id="pat-phone"
                value={phone}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, phoneConfig?.digits || 9);
                  setPhone(val);
                }}
                placeholder={phoneConfig?.placeholder || '123456789'}
                type="tel"
                maxLength={phoneConfig?.digits || 9}
                className="pl-20"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{phoneConfig?.digits || 9} digits required</p>
          </div>

          <select className="w-full border rounded p-2 text-sm" value={sex} onChange={e => setSex(e.target.value as 'male' | 'female' | '')}>
            <option value="">Select Sex</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={handleAdd} disabled={saving} className="w-full">Add Patient</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
