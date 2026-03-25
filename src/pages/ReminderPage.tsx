import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, Shield, Heart, Save, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

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
}

const STORAGE_KEY = 'caresync_reminders';

const defaultSettings: ReminderSettings = {
  tbcare: { enabled: false, frequency: 'daily', time: '08:00', reminderTypes: ['dueToday', 'dueTomorrow', 'dueThisWeek'] },
  hivcare: { enabled: false, frequency: 'daily', time: '08:00', reminderTypes: ['dueToday'] },
};

const programMeta = {
  tbcare: { label: 'TBCare', icon: Shield, colorClass: 'bg-primary' },
  hivcare: { label: 'HIVCare', icon: Heart, colorClass: 'bg-destructive' },
};

const REMINDER_TYPE_OPTIONS: { value: ReminderType; label: string; description: string }[] = [
  { value: 'dueToday', label: 'Due Today', description: 'Patients due for appointment today' },
  { value: 'dueTomorrow', label: 'Due Tomorrow', description: 'Patients due for appointment tomorrow' },
  { value: 'dueThisWeek', label: 'Due This Week', description: 'All patients due within the current week' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function loadSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      tbcare: { ...defaultSettings.tbcare, ...parsed.tbcare },
      hivcare: { ...defaultSettings.hivcare, ...parsed.hivcare },
    };
  } catch { return defaultSettings; }
}

function saveSettings(settings: ReminderSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function scheduleReminders(settings: ReminderSettings) {
  const existingTimers = JSON.parse(localStorage.getItem('caresync_reminder_timers') || '[]');
  existingTimers.forEach((id: number) => clearTimeout(id));

  const timerIds: number[] = [];

  Object.entries(settings).forEach(([program, config]) => {
    if (!config.enabled) return;

    const [hours, minutes] = config.time.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    if (config.frequency === 'weekly' && config.dayOfWeek !== undefined) {
      while (next.getDay() !== config.dayOfWeek) {
        next.setDate(next.getDate() + 1);
      }
    }

    const msUntilNext = next.getTime() - now.getTime();
    const meta = programMeta[program as keyof typeof programMeta];
    const types = config.reminderTypes || ['dueToday'];
    const typeLabels = types.map(t => REMINDER_TYPE_OPTIONS.find(o => o.value === t)?.label || t).join(', ');

    const timerId = window.setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${meta.label} Reminder`, {
          body: `Check your ${meta.label} patients: ${typeLabels}. Open CareSync to review.`,
          icon: '/favicon.ico',
          tag: `caresync-${program}`,
        });
      }
      scheduleReminders(settings);
    }, msUntilNext);

    timerIds.push(timerId);
  });

  localStorage.setItem('caresync_reminder_timers', JSON.stringify(timerIds));
}

export default function ReminderPage() {
  const [settings, setSettings] = useState<ReminderSettings>(loadSettings);
  const [permissionGranted, setPermissionGranted] = useState(
    'Notification' in window && Notification.permission === 'granted'
  );

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => setPermissionGranted(p === 'granted'));
    }
  }, []);

  const updateProgram = (program: keyof ReminderSettings, changes: Partial<ProgramReminder>) => {
    setSettings(prev => ({
      ...prev,
      [program]: { ...prev[program], ...changes },
    }));
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
          Set up automatic reminders for each program. Works offline like a phone alarm.
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
            <Button size="sm" variant="outline" onClick={() => {
              if ('Notification' in window) {
                Notification.requestPermission().then(p => setPermissionGranted(p === 'granted'));
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
          const Icon = meta.icon;
          const types = config.reminderTypes || ['dueToday'];
          return (
            <Card key={key} className={`transition-all ${config.enabled ? 'border-primary/30' : 'opacity-75'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg ${meta.colorClass} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{meta.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {config.enabled
                          ? `${config.frequency === 'daily' ? 'Every day' : `Every ${DAYS[config.dayOfWeek ?? 1]}`} at ${config.time}`
                          : 'Off'}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => updateProgram(key, { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {config.enabled && (
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Remind me about
                    </Label>
                    <div className="space-y-2">
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Frequency</Label>
                      <Select value={config.frequency} onValueChange={(v) => updateProgram(key, { frequency: v as Frequency })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Time
                      </Label>
                      <input
                        type="time"
                        value={config.time}
                        onChange={(e) => updateProgram(key, { time: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
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
