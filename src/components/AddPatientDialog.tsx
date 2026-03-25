import { useState } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { ProgramType } from '@/db/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: ProgramType;
}

export default function AddPatientDialog({ open, onOpenChange, program }: AddPatientDialogProps) {
  const { addPatient } = usePatients(program);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    await addPatient({
      name: name.trim(),
      phone: phone.trim(),
      sex: sex as 'male' | 'female',
      program,
      dateRegistered: new Date().toISOString(),
      status: 'ok',
    });
    setSaving(false);
    setName('');
    setPhone('');
    setSex('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Patient</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
          <select className="w-full border rounded p-2" value={sex} onChange={e => setSex(e.target.value as 'male' | 'female' | '')}>
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
