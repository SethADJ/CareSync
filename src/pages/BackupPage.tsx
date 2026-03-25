import { useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { Download, Upload } from 'lucide-react';
import {
  downloadBackupFile,
  importBackupFile,
  restoreBackup,
  type BackupData,
} from '@/utils/backup';
import { db } from '@/db/database';
import { setLastBackupDate, getLastBackupDate } from '@/hooks/useBackupReminder';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
        <p className="text-muted-foreground">
          <strong>{patientCount}</strong> patients on this device.
        </p>
        {lastBackup && (
          <p className="text-xs text-muted-foreground mt-1">
            Last backup: {format(parseISO(lastBackup), 'dd MMM yyyy, HH:mm')}
          </p>
        )}
      </div>

      {/* Local Backup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Backup
          </CardTitle>
          <CardDescription className="text-xs">
            Export and import your backup files.
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

      <AlertDialog open={!!confirmRestore} onOpenChange={(open) => !open && setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all data with <strong>{confirmRestore?.patients.length ?? 0} patients</strong> from{' '}
              {confirmRestore ? new Date(confirmRestore.exportedAt).toLocaleString() : ''}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRestore && doRestore(confirmRestore)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
