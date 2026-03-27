import { useMemo, useState } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { getProgramLabel } from '@/utils/program-logic';
import { getViralLoadStatus } from '@/utils/program-logic';
import type { ProgramType, Patient } from '@/db/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, CalendarDays, PersonStanding, CalendarClock, Activity, Droplets, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfWeek, endOfWeek, parseISO, isWithinInterval, format, startOfDay, startOfMonth, endOfMonth, addDays, isSameDay, addMonths } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import { motion } from 'framer-motion';
import { ProgramIcon } from '@/components/ProgramIcon';

interface DashboardProps {
  program: ProgramType;
}

type CardFilter = 'dueToday' | 'dueTomorrow' | 'defaulters' | 'dueThisWeek';

export default function Dashboard({ program }: DashboardProps) {
  const { patients, dueToday, overdue, isLoading } = usePatients(program);
  const navigate = useNavigate();

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;

  const dueThisWeek = useMemo(() =>
    patients.filter(p => {
      if (!p.nextDueDate) return false;
      const d = parseISO(p.nextDueDate);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    }),
    [patients, weekStart, weekEnd]
  );

  const dueTomorrow = useMemo(() =>
    patients.filter(p => {
      if (!p.nextDueDate) return false;
      try { return isSameDay(parseISO(p.nextDueDate), tomorrow); } catch { return false; }
    }),
    [patients, tomorrow]
  );

  // HIV-specific metrics
  const hivMetrics = useMemo(() => {
    if (program !== 'hivcare') return null;
    const withVL = patients.filter(p => p.viralLoadHistory && p.viralLoadHistory.length > 0);
    const suppressed = withVL.filter(p => getViralLoadStatus(p) === 'suppressed').length;
    const unsuppressed = withVL.filter(p => getViralLoadStatus(p) === 'unsuppressed').length;
    const noVL = patients.length - withVL.length;
    const vlDue = patients.filter(p => {
      const vlDate = p.lastViralLoadDate ? parseISO(p.lastViralLoadDate) : p.artStartDate ? parseISO(p.artStartDate) : null;
      if (!vlDate) return false;
      return addMonths(vlDate, 6) <= today;
    }).length;
    return { suppressed, unsuppressed, noVL, vlDue, total: patients.length };
  }, [patients, program, today]);


  // Gender data for bar chart
  const genderData = useMemo(() => {
    const male = patients.filter(p => p.sex === 'male').length;
    const female = patients.filter(p => p.sex === 'female').length;
    const unspecified = patients.length - male - female;
    const data = [
      { name: 'Male', count: male, fill: 'hsl(211, 90%, 42%)' },
      { name: 'Female', count: female, fill: 'hsl(330, 65%, 50%)' },
    ];
    if (unspecified > 0) data.push({ name: 'Unspecified', count: unspecified, fill: 'hsl(215, 15%, 50%)' });
    return data;
  }, [patients]);

  // Adherence rate: due patients who showed up / total due × 100, starting from first entry month
  const adherenceData = useMemo(() => {
    if (patients.length === 0) return [];
    // Find earliest registration date
    const dates = patients.map(p => {
      try { return parseISO(p.dateRegistered); } catch { return null; }
    }).filter(Boolean) as Date[];
    if (dates.length === 0) return [];
    const earliest = dates.reduce((a, b) => a < b ? a : b);
    const now = new Date();
    const months: { month: string; rate: number }[] = [];
    const startMonth = startOfMonth(earliest);
    let current = startMonth;
    while (current <= now) {
      const mStart = startOfMonth(current);
      const mEnd = endOfMonth(current);
      const totalDueInMonth = patients.filter(p => {
        if (!p.nextDueDate) return false;
        try {
          return isWithinInterval(parseISO(p.nextDueDate), { start: mStart, end: mEnd });
        } catch { return false; }
      }).length;
      const showedUp = patients.filter(p => {
        if (!p.nextDueDate) return false;
        try {
          const dd = parseISO(p.nextDueDate);
          return isWithinInterval(dd, { start: mStart, end: mEnd }) && (p.status === 'ok' || p.status === 'completed');
        } catch { return false; }
      }).length;
      const rate = totalDueInMonth > 0 ? Math.round((showedUp / totalDueInMonth) * 100) : 0;
      months.push({ month: format(current, 'MMM yy'), rate });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    // Show last 6 months max
    return months.slice(-6);
  }, [patients]);

  const genderChartConfig = {
    male: { label: 'Male', color: 'hsl(211, 90%, 42%)' },
    female: { label: 'Female', color: 'hsl(330, 65%, 50%)' },
    unspecified: { label: 'Unspecified', color: 'hsl(215, 15%, 50%)' },
  };

  const adherenceChartConfig = {
    rate: { label: 'Adherence Rate %', color: 'hsl(var(--primary))' },
  };

  const handleCardClick = (filter: CardFilter) => {
    navigate(`/${program}/dashboard/${filter}`);
  };

  

  const cards = [
    {
      key: 'dueToday' as CardFilter,
      icon: Clock,
      count: dueToday.length,
      label: 'Due Today',
      bgClass: 'bg-warning/10',
      iconClass: 'text-warning',
      pulseClass: 'card-pulse-warning',
      ringClass: 'ring-warning/50',
    },
    {
      key: 'dueTomorrow' as CardFilter,
      icon: CalendarClock,
      count: dueTomorrow.length,
      label: 'Due Tomorrow',
      bgClass: 'bg-primary/10',
      iconClass: 'text-primary',
      pulseClass: '',
      ringClass: 'ring-primary/50',
    },
    {
      key: 'defaulters' as CardFilter,
      icon: AlertTriangle,
      count: overdue.length,
      label: 'Defaulters',
      bgClass: 'bg-destructive/10',
      iconClass: 'text-destructive',
      pulseClass: 'card-pulse-destructive',
      ringClass: 'ring-destructive/50',
    },
    {
      key: 'dueThisWeek' as CardFilter,
      icon: CalendarDays,
      count: dueThisWeek.length,
      label: 'Due This Week',
      subtitle: weekLabel,
      bgClass: 'bg-accent/10',
      iconClass: 'text-accent-foreground',
      pulseClass: '',
      ringClass: 'ring-accent/50',
    },
  ];


  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                <ProgramIcon
                  program={program}
                  className="h-8 w-8 md:h-12 md:w-12"
                />
                {getProgramLabel(program)} Dashboard
              </h2>
              <p className="text-sm text-muted-foreground">Patient overview for {getProgramLabel(program)}</p>
            </div>
            <Button
              size="sm"
              className="self-start md:self-auto"
              onClick={() => navigate(`/${program}?addPatient=true`)}
            >
              <Plus className="h-4 w-4 mr-1" />Add Patient
            </Button>
          </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card
              className={`program-card cursor-pointer transition-all hover:shadow-md ${card.count > 0 && card.pulseClass ? card.pulseClass : ''}`}
              onClick={() => handleCardClick(card.key)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${card.bgClass} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.iconClass}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{card.count}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  {card.subtitle && (
                    <p className="text-[10px] text-muted-foreground/70">{card.subtitle}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Gender Bar Chart + Adherence Line Chart */}
      {patients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PersonStanding className="h-5 w-5 text-primary" />
                Total Patients by Gender ({patients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={genderChartConfig} className="h-[220px] w-full">
                <BarChart data={genderData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {genderData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Adherence Rate (%)
              </CardTitle>
              <p className="text-xs text-muted-foreground">Due patients who showed up / Total due × 100</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={adherenceChartConfig} className="h-[220px] w-full">
                <LineChart data={adherenceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="fill-muted-foreground" unit="%" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HIV-specific: Viral Load Summary */}
      {program === 'hivcare' && hivMetrics && patients.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="program-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{hivMetrics.suppressed}</p>
                  <p className="text-xs text-muted-foreground">VL Suppressed</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="program-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{hivMetrics.unsuppressed}</p>
                  <p className="text-xs text-muted-foreground">VL Unsuppressed</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="program-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Droplets className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{hivMetrics.vlDue}</p>
                  <p className="text-xs text-muted-foreground">VL Due</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card className="program-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{hivMetrics.noVL}</p>
                  <p className="text-xs text-muted-foreground">No VL Data</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

        {patients.length === 0 && (
          <Card className="program-card">
            <CardContent className="py-12 text-center">
              <ProgramIcon program={program} className="h-12 w-12 opacity-40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No patients yet</h3>
              <p className="text-muted-foreground mt-1">Go to the patient list to start adding patients.</p>
            </CardContent>
          </Card>
        )}
      </>
      )}
    </div>
  );
}
