import { db, type Patient, type LicenseInfo } from '@/db/database';

export interface BackupData {
  version: 1;
  exportedAt: string;
  patients: Patient[];
  license: LicenseInfo | null;
}

export function createBackup(): BackupData {
  const allPatients = [
    ...db.getPatients('tbcare'),
    ...db.getPatients('hivcare'),
  ];
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    patients: allPatients,
    license: db.getLicense(),
  };
}

export function restoreBackup(data: BackupData): { patientCount: number } {
  if (!data.version || !Array.isArray(data.patients)) {
    throw new Error('Invalid backup file format');
  }
  const tbPatients = data.patients.filter(p => p.program === 'tbcare');
  const hivPatients = data.patients.filter(p => p.program === 'hivcare');
  db.savePatients('tbcare', tbPatients);
  db.savePatients('hivcare', hivPatients);
  if (data.license) {
    db.saveLicense(data.license);
  }
  return { patientCount: data.patients.length };
}

export function downloadBackupFile(): void {
  const backup = createBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `caresync_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackupFile(): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return reject(new Error('No file selected'));
      try {
        const text = await file.text();
        const data = JSON.parse(text) as BackupData;
        resolve(data);
      } catch {
        reject(new Error('Failed to read backup file'));
      }
    };
    input.click();
  });
}

export function emailBackup(recipientEmail: string): void {
  const backup = createBackup();
  const json = JSON.stringify(backup, null, 2);
  const fileName = `caresync_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const subject = `CareSync Backup - ${new Date().toLocaleDateString()}`;
  const body = `Your CareSync backup is attached.\n\nPatients backed up: ${backup.patients.length}\nBackup date: ${new Date().toLocaleString()}\n\nIMPORTANT: Keep this file in a safe place. You can use it to restore your data if needed.`;
  const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  window.location.href = mailtoLink;
  
  setTimeout(() => {
    link.click();
    URL.revokeObjectURL(url);
  }, 500);
}
