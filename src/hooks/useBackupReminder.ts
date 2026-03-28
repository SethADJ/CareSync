import { useEffect } from 'react';
import { toast } from 'sonner';

const LAST_BACKUP_KEY = 'caresync_last_backup';
const REMINDER_SHOWN_KEY = 'caresync_backup_reminder_shown';

export function getLastBackupDate(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY);
}

export function setLastBackupDate(date?: string) {
  localStorage.setItem(LAST_BACKUP_KEY, date || new Date().toISOString());
}

export function useBackupReminder() {
  useEffect(() => {
    const checkAndShowReminder = () => {
      const now = new Date();
      const isMonday = now.getDay() === 1; // 1 = Monday
      const hour = now.getHours();
      const minute = now.getMinutes();
      const isEightAM = hour === 8 && minute < 10; // 8:00-8:09 AM window
      
      // Check if reminder was already shown today
      const reminderShownToday = localStorage.getItem(REMINDER_SHOWN_KEY);
      if (reminderShownToday) {
        const lastShownDate = new Date(reminderShownToday);
        const isSameDay = 
          lastShownDate.getDate() === now.getDate() &&
          lastShownDate.getMonth() === now.getMonth() &&
          lastShownDate.getFullYear() === now.getFullYear();
        
        if (isSameDay) return; // Already shown today
      }

      // Only show on Monday at 8:00-8:09 AM
      if (isMonday && isEightAM) {
        const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
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
              localStorage.setItem(REMINDER_SHOWN_KEY, new Date().toISOString());
            },
          }
        );

        // Mark reminder as shown
        localStorage.setItem(REMINDER_SHOWN_KEY, new Date().toISOString());
      }
    };

    // Check immediately
    checkAndShowReminder();

    // Check every minute to catch the 8:00 AM time
    const interval = setInterval(checkAndShowReminder, 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}
