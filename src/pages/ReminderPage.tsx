import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, Save, CalendarDays, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ProgramIcon } from '@/components/ProgramIcon';
import { usePatients } from '@/hooks/usePatients';
import { db, type Patient, type ProgramType } from '@/db/database';
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, parseISO, isWithinInterval, isSameDay } from 'date-fns';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

type Frequency = 'daily' | 'weekly';
type ReminderType = 'dueToday' | 'dueTomorrow' | 'dueThisWeek';

interface ProgramReminder {
  enabled: boolean;
  frequency: Frequency;
  time: string;
  dayOfWeek?: number;
  reminderTypes?: ReminderType[];
}

interface ReminderSettings {
  tbcare: ProgramReminder;
  hivcare: ProgramReminder;
  epi: ProgramReminder;
  anc: ProgramReminder;
}

const STORAGE_KEY = 'caresync_reminders';

const defaultSettings: ReminderSettings = {
  tbcare: { enabled: false, frequency: 'daily', time: '08:00', dayOfWeek: 1, reminderTypes: ['dueToday', 'dueTomorrow', 'dueThisWeek'] },
  hivcare: { enabled: false, frequency: 'daily', time: '08:00', dayOfWeek: 1, reminderTypes: ['dueToday'] },
  epi: { enabled: false, frequency: 'daily', time: '08:00', dayOfWeek: 1, reminderTypes: ['dueToday', 'dueTomorrow', 'dueThisWeek'] },
  anc: { enabled: false, frequency: 'daily', time: '08:00', dayOfWeek: 1, reminderTypes: ['dueToday', 'dueTomorrow', 'dueThisWeek'] },
};

const programMeta = {
  tbcare: { label: 'TBCare', locked: false },
  hivcare: { label: 'HIVCare', locked: true },
  epi: { label: 'EPI', locked: true },
  anc: { label: 'ANC', locked: true },
};

const REMINDER_TYPE_OPTIONS: { value: ReminderType; label: string; description: string }[] = [
  { value: 'dueToday', label: 'Due Today', description: 'Patients due for appointment today' },
  { value: 'dueTomorrow', label: 'Due Tomorrow', description: 'Patients due for appointment tomorrow' },
  { value: 'dueThisWeek', label: 'Due This Week', description: 'All patients due within the current week' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function countPatientsByReminderType(patients: Patient[], type: ReminderType): number {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = startOfDay(addDays(now, 1));
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  return patients.filter(p => {
    const nextDueStr = p.nextDueDate;
    if (!nextDueStr) return false;
    
    try {
      const dueDate = parseISO(nextDueStr);
      const dueDateStart = startOfDay(dueDate);

      switch (type) {
        case 'dueToday':
          return isSameDay(dueDateStart, today);
        case 'dueTomorrow':
          return isSameDay(dueDateStart, tomorrow);
        case 'dueThisWeek':
          return isWithinInterval(dueDateStart, { start: weekStart, end: weekEnd });
        default:
          return false;
      }
    } catch {
      return false;
    }
  }).length;
}

function loadSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      tbcare: { ...defaultSettings.tbcare, ...parsed.tbcare },
      hivcare: { ...defaultSettings.hivcare, ...parsed.hivcare },
      epi: { ...defaultSettings.epi, ...parsed.epi },
      anc: { ...defaultSettings.anc, ...parsed.anc },
    };
  } catch { return defaultSettings; }
}

function saveSettings(settings: ReminderSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

async function scheduleReminders(settings: ReminderSettings) {
  try {
    // Cancel all existing scheduled notifications for this app
    await LocalNotifications.cancelAll();
  } catch (error) {
    console.log('No existing notifications to cancel');
  }

  const notificationsToSchedule: any[] = [];

  Object.entries(settings).forEach(([program, config]) => {
    if (!config.enabled) return;

    const [hours, minutes] = config.time.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    // If we've passed this time today, schedule for next occurrence
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    // For weekly reminders, adjust to the correct day
    if (config.frequency === 'weekly' && config.dayOfWeek !== undefined) {
      while (next.getDay() !== config.dayOfWeek) {
        next.setDate(next.getDate() + 1);
      }
    }

    const meta = programMeta[program as keyof typeof programMeta];
    const types = config.reminderTypes || ['dueToday'];

    // Generate a unique ID for this scheduled notification
    const notificationId = Math.floor(Math.random() * 1000000000);

    notificationsToSchedule.push({
      title: `${meta.label} Appointment Reminder`,
      body: `It's time to manage appointments. Open now to check ${program} patients.`,
      id: notificationId,
      smallIcon: 'logo',
      largeBody: `Tap to open ${meta.label} and manage patient appointments.`,
      // Schedule for the calculated time
      schedule: {
        at: next,
        // Repeat according to frequency setting
        every: config.frequency === 'weekly' ? 'week' : 'day',
      },
      extra: {
        program,
        reminderTypes: types.join(','),
        navigationUrl: `/${program}`,
      },
    });
  });

  // Schedule all notifications at once
  if (notificationsToSchedule.length > 0) {
    try {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
      console.log(`Scheduled ${notificationsToSchedule.length} background reminders using Capacitor`);
    } catch (error) {
      console.error('Failed to schedule notifications:', error);
    }
  }
}

export default function ReminderPage() {
  const [settings, setSettings] = useState<ReminderSettings>(loadSettings);
  const [permissionGranted, setPermissionGranted] = useState(
    'Notification' in window && Notification.permission === 'granted'
  );
  
  // Fetch patients for all programs
  const tbPatients = usePatients('tbcare').patients;
  const hivPatients = usePatients('hivcare').patients;
  const epiPatients = usePatients('epi').patients;
  const ancPatients = usePatients('anc').patients;
  
  const patientsByProgram: Record<keyof ReminderSettings, Patient[]> = {
    tbcare: tbPatients,
    hivcare: hivPatients,
    epi: epiPatients,
    anc: ancPatients,
  };

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Try to get existing permissions (Capacitor)
        const result = await LocalNotifications.checkPermissions();
        if (result.display === 'granted') {
          setPermissionGranted(true);
        } else if (result.display === 'prompt') {
          // Request permissions if not yet determined
          const requestResult = await LocalNotifications.requestPermissions();
          setPermissionGranted(requestResult.display === 'granted');
        } else {
          setPermissionGranted(false);
        }
      } catch (error) {
        // Fallback to Web Notifications API
        console.log('Capacitor notifications not available, falling back to Web Notifications API');
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then((p) => setPermissionGranted(p === 'granted'));
        } else if ('Notification' in window) {
          setPermissionGranted(Notification.permission === 'granted');
        }
      }
    };

    initializeNotifications();
  }, []);

  const previewReminder = async (program: keyof ReminderSettings) => {
    if (!permissionGranted) {
      toast.error('Please enable notifications to test reminders.');
      return;
    }

    try {
      const meta = programMeta[program];
      const config = settings[program];
      const types = config.reminderTypes || ['dueToday'];
      const programPatients = patientsByProgram[program];
      
      // Calculate actual patient counts
      const patientCounts = {
        dueToday: countPatientsByReminderType(programPatients, 'dueToday'),
        dueTomorrow: countPatientsByReminderType(programPatients, 'dueTomorrow'),
        dueThisWeek: countPatientsByReminderType(programPatients, 'dueThisWeek'),
      };
      
      const messages: Record<ReminderType, string> = {
        dueToday: `${patientCounts.dueToday} patient${patientCounts.dueToday !== 1 ? 's' : ''} due for refill today`,
        dueTomorrow: `${patientCounts.dueTomorrow} patient${patientCounts.dueTomorrow !== 1 ? 's' : ''} due tomorrow`,
        dueThisWeek: `${patientCounts.dueThisWeek} patient${patientCounts.dueThisWeek !== 1 ? 's' : ''} due this week`,
      };
      
      const enabledMessages = types
        .filter(t => patientCounts[t] > 0)
        .map(t => messages[t]);
      
      const notificationBody = enabledMessages.length > 0
        ? `App log: ${enabledMessages.join(' • ')}. Tap to open the list.`
        : `App log: No patients due for refill in your selected categories. Tap to open program.`;
      
      const filterType = types.find(t => patientCounts[t] > 0);

      // Use Capacitor LocalNotifications first (works on Android and web)
      await LocalNotifications.schedule({
        notifications: [{
          title: `${meta.label} Appointment Reminder (Test)`,
          body: notificationBody,
          id: Math.floor(Math.random() * 1000000),
          smallIcon: 'logo',
          largeBody: notificationBody,
          extra: {
            program,
            filterType: filterType || 'none',
            isTest: true,
          },
        }],
      });

      // Fallback to Web Notifications for browser
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`${meta.label} Appointment Reminder (Test)`, {
          body: notificationBody,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: `caresync-test-${program}`,
          requireInteraction: false,
        });
        
        notification.onclick = () => {
          window.focus();
          const baseUrl = `/${program}`;
          const url = filterType ? `${baseUrl}?filter=${filterType}` : baseUrl;
          window.location.href = url;
          notification.close();
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      }
      
      toast.success('Test reminder sent. Click it to view patients!');
    } catch (error) {
      console.error('Failed to create notification:', error);
      toast.error('Failed to send test reminder. Check notification settings.');
    }
  };

  const updateProgram = (program: keyof ReminderSettings, changes: Partial<ProgramReminder>) => {
    setSettings(prev => ({
      ...prev,
      [program]: { ...prev[program], ...changes },
    }));
  };

  const handleToggleReminder = async (program: keyof ReminderSettings, checked: boolean) => {
    // If enabling reminders on Android, request notification permission first
    if (checked && Capacitor.isNativePlatform()) {
      try {
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          const result = await LocalNotifications.requestPermissions();
          if (result.display === 'denied') {
            toast.error('Please enable notifications in settings to use reminders');
            return; // Don't enable the reminder if permission is denied
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
    updateProgram(program, { enabled: checked });
  };

  const toggleReminderType = (program: keyof ReminderSettings, type: ReminderType) => {
    const current = settings[program].reminderTypes || ['dueToday'];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    if (updated.length === 0) return;
    updateProgram(program, { reminderTypes: updated });
  };

  const handleSave = () => {
    saveSettings(settings);
    scheduleReminders(settings);
    toast.success('Reminder settings saved');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          Reminders
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure scheduled reminders for TBCare, HIVCare, EPI, and ANC. Notifications work on Android and browser, and persist across refreshes (requires device notification permission).
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Tip: choose “weekly” for planned check-ins, and “daily” for critical follow-ups.
        </p>
      </div>

      {!permissionGranted && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Notifications Blocked</p>
              <p className="text-xs text-muted-foreground">Enable notifications in your browser/device settings for reminders to work.</p>
            </div>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                const result = await LocalNotifications.requestPermissions();
                setPermissionGranted(result.display === 'granted');
              } catch (error) {
                // Fallback to Web Notifications API
                if ('Notification' in window) {
                  const permission = await Notification.requestPermission();
                  setPermissionGranted(permission === 'granted');
                }
              }
            }}>
              Enable
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {(Object.entries(programMeta) as [keyof ReminderSettings, typeof programMeta.tbcare][]).map(([key, meta]) => {
          const config = settings[key];
          const types = config.reminderTypes || ['dueToday'];
          const programPatients = patientsByProgram[key];
          
          // Calculate patient counts for the selected reminder types
          const patientCounts = {
            dueToday: countPatientsByReminderType(programPatients, 'dueToday'),
            dueTomorrow: countPatientsByReminderType(programPatients, 'dueTomorrow'),
            dueThisWeek: countPatientsByReminderType(programPatients, 'dueThisWeek'),
          };
          
          const totalDue = types.reduce((sum, type) => sum + patientCounts[type], 0);
          
          return (
            <Card key={key} className={`transition-all ${config.enabled ? 'border-primary/30' : 'opacity-75'} ${meta.locked ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ProgramIcon program={key} className="h-9 w-9" />
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{meta.label}</CardTitle>
                        {meta.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <CardDescription className="text-xs">
                        {meta.locked ? 'Locked' : (config.enabled
                          ? `${config.frequency === 'daily' ? 'Every day' : `Every ${DAYS[config.dayOfWeek ?? 1]}`} at ${config.time}`
                          : 'Off')}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!meta.locked && totalDue > 0 && (
                      <div className="flex items-center gap-1 text-sm font-medium text-orange-600">
                        <Users className="h-4 w-4" />
                        <span>{totalDue} patient{totalDue !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <Switch
                      checked={config.enabled}
                      disabled={meta.locked}
                      onCheckedChange={(checked) => handleToggleReminder(key, checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              {config.enabled && !meta.locked && (
                <CardContent className="pt-0 space-y-4">
                  <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">Patient Count Summary</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`text-center rounded p-2 ${types.includes('dueToday') ? 'bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700' : 'bg-muted'}`}>
                        <p className="text-xs text-muted-foreground font-medium">Today</p>
                        <p className={`text-sm font-bold ${types.includes('dueToday') ? 'text-blue-900 dark:text-blue-100' : 'text-foreground'}`}>
                          {patientCounts.dueToday}
                        </p>
                      </div>
                      <div className={`text-center rounded p-2 ${types.includes('dueTomorrow') ? 'bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700' : 'bg-muted'}`}>
                        <p className="text-xs text-muted-foreground font-medium">Tomorrow</p>
                        <p className={`text-sm font-bold ${types.includes('dueTomorrow') ? 'text-blue-900 dark:text-blue-100' : 'text-foreground'}`}>
                          {patientCounts.dueTomorrow}
                        </p>
                      </div>
                      <div className={`text-center rounded p-2 ${types.includes('dueThisWeek') ? 'bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700' : 'bg-muted'}`}>
                        <p className="text-xs text-muted-foreground font-medium">This Week</p>
                        <p className={`text-sm font-bold ${types.includes('dueThisWeek') ? 'text-blue-900 dark:text-blue-100' : 'text-foreground'}`}>
                          {patientCounts.dueThisWeek}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-200 mt-2">
                      📌 App log: daily due counts appear here. Click notification to open filtered patient list.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Reminder details</p>
                    <Button size="sm" variant="secondary" onClick={() => previewReminder(key)}>
                      Test Reminder
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Remind me about
                    </Label>
                    <div className="flex flex-col gap-3">
                      {REMINDER_TYPE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                            types.includes(option.value)
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <Checkbox
                            checked={types.includes(option.value)}
                            onCheckedChange={() => toggleReminderType(key, option.value)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Frequency</Label>
                      <Select value={config.frequency} onValueChange={(v) => {
                        const newFreq = v as Frequency;
                        if (newFreq === 'weekly' && !config.dayOfWeek) {
                          updateProgram(key, { frequency: newFreq, dayOfWeek: 1, time: '08:00' });
                        } else {
                          updateProgram(key, { frequency: newFreq });
                        }
                      }}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly (Mondays)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Time
                        {types.includes('dueTomorrow') && <span className="text-orange-600 font-medium ml-auto text-xs">(6:00 PM suggested)</span>}
                      </Label>
                      <input
                        type="time"
                        value={config.time}
                        onChange={(e) => updateProgram(key, { time: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      {types.includes('dueTomorrow') && config.time !== '18:00' && (
                        <p className="text-xs text-orange-700 dark:text-orange-200">💡 Tip: Set to 18:00 (6:00 PM) for tomorrow reminders</p>
                      )}
                    </div>
                  </div>

                  {config.frequency === 'weekly' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Day of Week</Label>
                      <Select value={String(config.dayOfWeek ?? 1)} onValueChange={(v) => updateProgram(key, { dayOfWeek: Number(v) })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day, i) => (
                            <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Button onClick={handleSave} className="w-full gap-2">
        <Save className="h-4 w-4" />
        Save Reminder Settings
      </Button>
    </div>
  );
}
