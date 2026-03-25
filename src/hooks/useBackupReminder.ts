import { useEffect } from 'react';
import { toast } from 'sonner';

const LAST_BACKUP_KEY = 'caresync_last_backup';
const REMINDER_DISMISSED_KEY = 'caresync_backup_reminder_dismissed';
const REMINDER_INTERVAL_DAYS = 14;

export function getLastBackupDate(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY);
}

export function setLastBackupDate(date?: string) {
  localStorage.setItem(LAST_BACKUP_KEY, date || new Date().toISOString());
}

export function useBackupReminder() {
  useEffect(() => {
    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    const dismissed = localStorage.getItem(REMINDER_DISMISSED_KEY);

    // Check if reminder was dismissed recently (within 1 day)
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const hoursSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    const shouldRemind = () => {
      if (!lastBackup) return true; // Never backed up
      const last = new Date(lastBackup);
      const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= REMINDER_INTERVAL_DAYS;
    };

    if (shouldRemind()) {
      // Small delay so it doesn't fire during initial render
      const timer = setTimeout(() => {
        const daysSince = lastBackup
          ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        toast.warning(
          daysSince
            ? `It's been ${daysSince} days since your last backup. Connect to the internet and back up your data.`
            : `You haven't backed up your data yet. Connect to the internet and back up to keep your patients safe.`,
          {
            duration: 10000,
            action: {
              label: 'Back up now',
              onClick: () => {
                window.location.href = '/backup';
              },
            },
            onDismiss: () => {
              localStorage.setItem(REMINDER_DISMISSED_KEY, new Date().toISOString());
            },
          }
        );
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);
}
