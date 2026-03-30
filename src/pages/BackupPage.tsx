import { useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { Download, Upload, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  downloadBackupFile,
  importBackupFile,
  restoreBackup,
  emailBackup,
  type BackupData,
} from '@/utils/backup';
import { db } from '@/db/database';
import { setLastBackupDate, getLastBackupDate } from '@/hooks/useBackupReminder';
import { getUserProfile } from '@/pages/SignupPage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, parseISO } from 'date-fns';

export default function BackupPage() {
  const [confirmRestore, setConfirmRestore] = useState<BackupData | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailConfirmDialog, setEmailConfirmDialog] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  
  const userProfile = getUserProfile();
  const savedEmail = userProfile?.email;

  const patientCount = db.getPatients('tbcare').length + db.getPatients('hivcare').length;
  const lastBackup = getLastBackupDate();

  const handleExport = useCallback(() => {
    downloadBackupFile();
    setLastBackupDate();
    toast.success('Backup downloaded successfully');
  }, []);

  const handleImport = useCallback(async () => {
    try {
      const data = await importBackupFile();
      setConfirmRestore(data);
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    }
  }, []);

  const doRestore = useCallback((data: BackupData) => {
    const result = restoreBackup(data);
    toast.success(`Restored ${result.patientCount} patients`);
    setConfirmRestore(null);
  }, []);

  const handleEmailBackupClick = useCallback(() => {
    if (savedEmail) {
      setEmailConfirmDialog(true);
    } else {
      setEmailDialogOpen(true);
    }
  }, [savedEmail]);

  const handleUseSavedEmail = useCallback(() => {
    if (savedEmail) {
      try {
        emailBackup(savedEmail);
        setLastBackupDate();
        setEmailConfirmDialog(false);
        toast.success('Backup email ready to send');
      } catch (err: any) {
        toast.error(err.message || 'Failed to prepare email backup');
      }
    }
  }, [savedEmail]);

  const handleEmailSubmit = useCallback(() => {
    if (!emailInput.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      emailBackup(emailInput);
      setLastBackupDate();
      setEmailInput('');
      setEmailDialogOpen(false);
      toast.success('Backup email ready to send');
    } catch (err: any) {
      toast.error(err.message || 'Failed to prepare email backup');
    }
  }, [emailInput]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg border p-6">
        <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
        <p className="text-muted-foreground mt-1">
          <strong>{patientCount}</strong> patients on this device
          {lastBackup && (
            <>
              {' • '}
              Last backup: {format(parseISO(lastBackup), 'dd MMM yyyy, HH:mm')}
            </>
          )}
        </p>
      </div>

      {/* Local Backup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Local Backup
          </CardTitle>
          <CardDescription className="text-xs">
            Export and import backup files on this device
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" variant="outline" onClick={handleImport} className="gap-2">
            <Upload className="h-4 w-4" /> Import
          </Button>
        </CardContent>
      </Card>

      {/* Email Backup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            Email Backup
          </CardTitle>
          <CardDescription className="text-xs">
            Send your backup securely to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={handleEmailBackupClick} className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl">
            <Mail className="h-4 w-4" /> Email Backup
          </Button>
        </CardContent>
      </Card>

      {/* Email Confirmation Dialog - Ask to use saved email */}
      <AlertDialog open={emailConfirmDialog} onOpenChange={setEmailConfirmDialog}>
        <AlertDialogContent className="max-w-xs rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Use Saved Email?</AlertDialogTitle>
            <AlertDialogDescription>
              We found your email from signup: <strong>{savedEmail}</strong>. Would you like to use it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setEmailConfirmDialog(false);
              setEmailDialogOpen(true);
            }} className="rounded-xl">
              Use Different Email
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUseSavedEmail} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
              Use This Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Input Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Email Backup</DialogTitle>
            <DialogDescription>
              Enter your email address to receive your backup file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
              className="rounded-xl"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleEmailSubmit} className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl">
                <Mail className="h-4 w-4" /> Send Backup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!confirmRestore} onOpenChange={(open) => !open && setConfirmRestore(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all data with <strong>{confirmRestore?.patients.length ?? 0} patients</strong> from{' '}
              {confirmRestore ? new Date(confirmRestore.exportedAt).toLocaleString() : ''}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRestore && doRestore(confirmRestore)} className="rounded-xl">
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
