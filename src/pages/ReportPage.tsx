import { useState, useMemo } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { useLogs } from '@/hooks/useLogs';
import { getProgramLabel } from '@/utils/program-logic';
import { db, type ProgramType } from '@/db/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Heart, Baby, Users as UsersIcon, FileText, Table2, BarChart3, PieChart as PieIcon, LineChart as LineIcon, LayoutList } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, eachMonthOfInterval, addDays } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const programIcons: Record<ProgramType, React.ElementType> = {
  tbcare: Shield, hivcare: Heart,
};

const TB_TYPE_LABELS: Record<string, string> = {
  'pulmonary-positive': 'Pulmonary TB (Positive)',
  'pulmonary-negative': 'Pulmonary TB (Negative)',
  'extra-pulmonary': 'Extra-Pulmonary TB',
  mdr: 'MDR-TB',
};

const TB_TYPE_COLORS: Record<string, string> = {
  'pulmonary-positive': 'hsl(30, 90%, 50%)',   // orange
  'pulmonary-negative': 'hsl(142, 70%, 40%)',   // green
  'extra-pulmonary': 'hsl(48, 90%, 50%)',       // yellow
  mdr: 'hsl(0, 75%, 50%)',                      // red
  unspecified: 'hsl(215, 15%, 50%)',
};

interface ReportPageProps {
  program: ProgramType;
}

type Period = 'monthly' | 'yearly';
type ViewMode = 'table' | 'bar' | 'pie' | 'line';

export default function ReportPage({ program }: ReportPageProps) {
  const { patients } = usePatients(program);
  const { logs } = useLogs(program);
  const Icon = programIcons[program];
  const [period, setPeriod] = useState<Period>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  // Start year dropdown from 2026
  const [selectedYear, setSelectedYear] = useState('2026');
  // Individual view modes for each report section
  const [monthlyTrendView, setMonthlyTrendView] = useState<ViewMode>('bar');
  const [genderView, setGenderView] = useState<ViewMode>('bar');
  const [tbTypeView, setTbTypeView] = useState<ViewMode>('bar');
  const [adherenceView, setAdherenceView] = useState<ViewMode>('bar');
  const [adherenceTrendView, setAdherenceTrendView] = useState<ViewMode>('bar');
  const [diseaseBurdenView, setDiseaseBurdenView] = useState<ViewMode>('bar');
  const [locationView, setLocationView] = useState<ViewMode>('bar');

  const dateRange = useMemo(() => {
    if (period === 'monthly') {
      const d = parseISO(`${selectedMonth}-01`);
      return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMMM yyyy') };
    }
    const d = new Date(Number(selectedYear), 0, 1);
    return { start: startOfYear(d), end: endOfYear(d), label: selectedYear };
  }, [period, selectedMonth, selectedYear]);

  const registeredInPeriod = useMemo(() =>
    patients.filter(p => {
      try {
        return isWithinInterval(parseISO(p.dateRegistered), { start: dateRange.start, end: dateRange.end });
      } catch { return false; }
    }), [patients, dateRange]);

  const dueInPeriod = useMemo(() =>
    patients.filter(p => {
      if (!p.nextDueDate) return false;
      try {
        return isWithinInterval(parseISO(p.nextDueDate), { start: dateRange.start, end: dateRange.end });
      } catch { return false; }
    }), [patients, dateRange]);

  const stats = useMemo(() => {
    const total = patients.length;
    const male = patients.filter(p => p.sex === 'male').length;
    const female = patients.filter(p => p.sex === 'female').length;
    const overdue = patients.filter(p => p.status === 'overdue').length;
    const adherenceRate = total > 0 ? Math.round((dueInPeriod.length / total) * 100) : 0;
    return { total, male, female, overdue, adherenceRate, newRegistered: registeredInPeriod.length };
  }, [patients, dueInPeriod, registeredInPeriod]);

  const monthlyTrend = useMemo(() => {
    if (period !== 'yearly') return [];
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    return months.map(m => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const reg = patients.filter(p => {
        try { return isWithinInterval(parseISO(p.dateRegistered), { start: mStart, end: mEnd }); } catch { return false; }
      }).length;
      const dueCount = patients.filter(p => {
        if (!p.nextDueDate) return false;
        try { return isWithinInterval(parseISO(p.nextDueDate), { start: mStart, end: mEnd }); } catch { return false; }
      }).length;
      return { month: format(m, 'MMM'), registered: reg, due: dueCount };
    });
  }, [period, patients, dateRange]);

  const genderData = [
    { name: 'Male', count: stats.male, fill: 'hsl(211, 90%, 42%)' },
    { name: 'Female', count: stats.female, fill: 'hsl(330, 65%, 50%)' },
  ];

  const tbTypeData = useMemo(() => {
    if (program !== 'tbcare') return [];
    const counts: Record<string, number> = {};
    patients.forEach(p => {
      const t = p.tbType || 'unspecified';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([key, count]) => ({
      name: TB_TYPE_LABELS[key] || 'Unspecified',
      count,
      fill: TB_TYPE_COLORS[key] || TB_TYPE_COLORS.unspecified,
    }));
  }, [patients, program]);

  // HIV Adherence: aggregate showed vs missed across all HIV patients
  const adherenceData = useMemo(() => {
    if (program !== 'hivcare') return [];
    const showed = patients.reduce((sum, p) => {
      if (!p.hivAttendance) return sum;
      return sum + Object.values(p.hivAttendance).filter(v => v === 'showed').length;
    }, 0);
    const missed = patients.reduce((sum, p) => {
      if (!p.hivAttendance) return sum;
      return sum + Object.values(p.hivAttendance).filter(v => v === 'missed').length;
    }, 0);
    if (showed === 0 && missed === 0) return [];
    return [
      { name: 'Showed', count: showed, fill: 'hsl(142, 70%, 40%)' },
      { name: 'Missed', count: missed, fill: 'hsl(0, 75%, 50%)' },
    ];
  }, [patients, program]);

  // HIV Monthly Adherence Trend: showed vs missed per month
  const monthlyAdherenceTrend = useMemo(() => {
    if (program !== 'hivcare') return [];
    const monthMap: Record<string, { showed: number; missed: number }> = {};
    patients.forEach(p => {
      if (!p.hivAttendance || !p.artStartDate) return;
      const artStart = parseISO(p.artStartDate);
      const interval = p.hivRefillInterval ?? 90;
      Object.entries(p.hivAttendance).forEach(([refillStr, status]) => {
        const refillNum = Number(refillStr);
        const refillDate = addDays(artStart, refillNum * interval);
        const monthKey = format(refillDate, 'yyyy-MM');
        if (!monthMap[monthKey]) monthMap[monthKey] = { showed: 0, missed: 0 };
        if (status === 'showed') monthMap[monthKey].showed++;
        else if (status === 'missed') monthMap[monthKey].missed++;
      });
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, val]) => ({
        month: format(parseISO(`${key}-01`), 'MMM yyyy'),
        showed: val.showed,
        missed: val.missed,
      }));
  }, [patients, program]);

  const diseaseBurdenData = useMemo(() => {
    const programs: ProgramType[] = ['tbcare', 'hivcare'];
    return programs.map(prog => {
      const pats = db.getPatients(prog);
      return {
        name: getProgramLabel(prog),
        male: pats.filter((p: any) => p.sex === 'male').length,
        female: pats.filter((p: any) => p.sex === 'female').length,
      };
    }).filter(d => d.male > 0 || d.female > 0);
  }, [patients]);

  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    patients.forEach(p => {
      const loc = p.location?.trim() || 'Unknown';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [patients]);

  const chartConfig = {
    male: { label: 'Male', color: 'hsl(211, 90%, 42%)' },
    female: { label: 'Female', color: 'hsl(330, 65%, 50%)' },
    registered: { label: 'Registered', color: 'hsl(var(--primary))' },
    due: { label: 'Due', color: 'hsl(var(--warning))' },
    count: { label: 'Cases', color: 'hsl(var(--primary))' },
  };

  const reportTitle = `${getProgramLabel(program)} Report - ${dateRange.label}`;

  const buildSummaryData = () => [
    { Metric: 'Total Patients', Value: stats.total },
    { Metric: 'Male', Value: stats.male },
    { Metric: 'Female', Value: stats.female },
    { Metric: 'Defaulters', Value: stats.overdue },
    { Metric: 'New Registrations', Value: stats.newRegistered },
    { Metric: 'Adherence Rate (%)', Value: stats.adherenceRate },
  ];

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(reportTitle, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 28);
    doc.setFontSize(12);
    doc.text('Summary', 14, 40);
    doc.setFontSize(10);
    const summaryLines = [
      `Total Patients: ${stats.total}`,
      `Male: ${stats.male} | Female: ${stats.female}`,
      `Defaulters: ${stats.overdue}`,
      `New Registrations (${dateRange.label}): ${stats.newRegistered}`,
      `Adherence Rate: ${stats.adherenceRate}%`,
    ];
    summaryLines.forEach((line, i) => doc.text(line, 14, 48 + i * 6));
    let yPos = 82;
    if (locationData.length > 0) {
      doc.setFontSize(12);
      doc.text('Cases by Location', 14, yPos);
      autoTable(doc, {
        startY: yPos + 4,
        head: [['Location', 'Cases']],
        body: locationData.map(r => [r.name, String(r.count)]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [33, 100, 180] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    if (program === 'tbcare' && tbTypeData.length > 0) {
      doc.setFontSize(12);
      doc.text('Type of TB', 14, yPos);
      autoTable(doc, {
        startY: yPos + 4,
        head: [['Type', 'Count']],
        body: tbTypeData.map(r => [r.name, String(r.count)]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [33, 100, 180] },
      });
    }
    doc.save(`${getProgramLabel(program)}_Report_${dateRange.label.replace(/\s/g, '_')}.pdf`);
  };

  const downloadExcel = () => {
    const summarySheet = XLSX.utils.json_to_sheet(buildSummaryData());
    const locationSheet = XLSX.utils.json_to_sheet(locationData.map(l => ({ Location: l.name, Cases: l.count })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(wb, locationSheet, 'By Location');
    if (program === 'tbcare' && tbTypeData.length > 0) {
      const tbSheet = XLSX.utils.json_to_sheet(tbTypeData.map(t => ({ Type: t.name, Count: t.count })));
      XLSX.utils.book_append_sheet(wb, tbSheet, 'TB Types');
    }
    XLSX.writeFile(wb, `${getProgramLabel(program)}_Report_${dateRange.label.replace(/\s/g, '_')}.xlsx`);
  };

  // Years from 2026 down to 5 years back
  const years = Array.from({ length: 5 }, (_, i) => String(2026 - i));

  // Render chart based on viewMode for a given dataset
  const renderDataView = (data: { name: string; count: number; fill?: string }[], title: string, viewMode: ViewMode) => {
    if (viewMode === 'table') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title}</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(row => (
              <TableRow key={row.name}>
                <TableCell className="flex items-center gap-2">
                  {row.fill && <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: row.fill }} />} 
                  {row.name}
                </TableCell>
                <TableCell className="text-right font-medium">{row.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    if (viewMode === 'pie') {
      return (
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, count }) => `${name}: ${count}`}>
              {data.map((entry, idx) => <Cell key={idx} fill={entry.fill || 'hsl(var(--primary))'} />)}
            </Pie>
          </PieChart>
        </ChartContainer>
      );
    }
    if (viewMode === 'line') {
      return (
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }}>
              {data.map((entry, idx) => <Cell key={idx} fill={entry.fill || 'hsl(var(--primary))'} />)}
            </Line>
          </LineChart>
        </ChartContainer>
      );
    }
    // default: bar
    return (
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
            {data.map((entry, idx) => <Cell key={idx} fill={entry.fill || 'hsl(var(--primary))'} />)}
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" />
            {getProgramLabel(program)} Reports
          </h2>

        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as Period)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          {period === 'monthly' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
          {period === 'yearly' && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <Button size="sm" variant="outline" onClick={downloadPDF}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={downloadExcel}>
            <Table2 className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Monthly Trend - always first */}
      {period === 'yearly' && monthlyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Monthly Trend ({selectedYear})</CardTitle>
            </div>
            {/* Data view options for Monthly Trend */}
            <ToggleGroup type="single" value={monthlyTrendView} onValueChange={(v) => v && setMonthlyTrendView(v as ViewMode)} size="sm" className="border border-border rounded-md mt-2 md:mt-0">
              <ToggleGroupItem value="table" aria-label="Table view"><LayoutList className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="bar" aria-label="Bar chart"><BarChart3 className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="pie" aria-label="Pie chart"><PieIcon className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="line" aria-label="Line chart"><LineIcon className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            {monthlyTrendView === 'table' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Registered</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyTrend.map(row => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell className="text-right">{row.registered}</TableCell>
                      <TableCell className="text-right">{row.due}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="registered" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="due" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {(() => {
          // Total Due for Refill: patients with nextDueDate in selected month/year
          const totalDueForRefill = dueInPeriod.length;
          const activePatientIds = new Set(patients.map(p => p.id));
          // Total Showed Up: unique existing patients with follow-up-call log in selected month/year
          const totalShowedUp = new Set(
            logs
              .filter(l =>
                l.action === 'follow-up-call' &&
                activePatientIds.has(l.patientId) &&
                isWithinInterval(parseISO(l.date), { start: dateRange.start, end: dateRange.end })
              )
              .map(l => l.patientId)
          ).size;
          // Adherence Rate: (totalShowedUp / totalDueForRefill) * 100
          const adherenceRate = totalDueForRefill > 0 ? Math.round((totalShowedUp / totalDueForRefill) * 100) : 0;
          // Defaulter Rate: defaulters / total due for refill
          const defaulters = patients.filter(p => p.status === 'overdue' && p.nextDueDate && isWithinInterval(parseISO(p.nextDueDate), { start: dateRange.start, end: dateRange.end })).length;
          const defaulterRate = totalDueForRefill > 0 ? Math.round((defaulters / totalDueForRefill) * 100) : 0;
          return [
            { label: 'Total Patients', value: stats.total, color: 'text-primary' },
            { label: 'Total Due for Refill', value: totalDueForRefill, color: 'text-warning' },
            { label: 'Total Showed Up', value: totalShowedUp, color: 'text-success' },
            { label: 'Total Defaulters', value: defaulters, color: 'text-destructive' },
            { label: 'Adherence Rate', value: `${adherenceRate}%`, color: 'text-primary' },
            { label: 'Defaulter Rate', value: `${defaulterRate}%`, color: 'text-destructive' },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  <p className={`text-xs font-medium mt-1 ${item.color}`}>{item.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ));
        })()}
      </div>

      {/* Charts / Tables */}
      {patients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Gender Distribution</CardTitle>
              </div>
              {/* Data view options for Gender Distribution */}
              <ToggleGroup type="single" value={genderView} onValueChange={(v) => v && setGenderView(v as ViewMode)} size="sm" className="border border-border rounded-md mt-2 md:mt-0">
                <ToggleGroupItem value="table" aria-label="Table view"><LayoutList className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="bar" aria-label="Bar chart"><BarChart3 className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="pie" aria-label="Pie chart"><PieIcon className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="line" aria-label="Line chart"><LineIcon className="h-4 w-4" /></ToggleGroupItem>
              </ToggleGroup>
            </CardHeader>
            <CardContent>
              {renderDataView(genderData, 'Gender', genderView)}
            </CardContent>
          </Card>

          {program === 'tbcare' && tbTypeData.length > 0 && (
            <Card>
              <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Type of TB</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {tbTypeData.map(t => (
                      <span key={t.name} className="inline-flex items-center gap-1 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: t.fill }} />
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Data view options for TB Type */}
                <ToggleGroup type="single" value={tbTypeView} onValueChange={(v) => v && setTbTypeView(v as ViewMode)} size="sm" className="border border-border rounded-md mt-2 md:mt-0">
                  <ToggleGroupItem value="table" aria-label="Table view"><LayoutList className="h-4 w-4" /></ToggleGroupItem>
                  <ToggleGroupItem value="bar" aria-label="Bar chart"><BarChart3 className="h-4 w-4" /></ToggleGroupItem>
                  <ToggleGroupItem value="pie" aria-label="Pie chart"><PieIcon className="h-4 w-4" /></ToggleGroupItem>
                  <ToggleGroupItem value="line" aria-label="Line chart"><LineIcon className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
              </CardHeader>
              <CardContent>
                {renderDataView(tbTypeData, 'TB Type', tbTypeView)}
              </CardContent>
            </Card>
          )}

          {program === 'hivcare' && adherenceData.length > 0 && (
            <Card>
              <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Refill Adherence Summary</CardTitle>
                  <p className="text-xs text-muted-foreground">Showed vs missed refill appointments</p>
                </div>
                <ToggleGroup type="single" value={adherenceView} onValueChange={(v) => v && setAdherenceView(v as ViewMode)} size="sm" className="border border-border rounded-md mt-2 md:mt-0">
                  <ToggleGroupItem value="table" aria-label="Table view"><LayoutList className="h-4 w-4" /></ToggleGroupItem>
                  <ToggleGroupItem value="bar" aria-label="Bar chart"><BarChart3 className="h-4 w-4" /></ToggleGroupItem>
                  <ToggleGroupItem value="pie" aria-label="Pie chart"><PieIcon className="h-4 w-4" /></ToggleGroupItem>
                  <ToggleGroupItem value="line" aria-label="Line chart"><LineIcon className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
              </CardHeader>
              <CardContent>
                {renderDataView(adherenceData, 'Status', adherenceView)}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Monthly Adherence Trend */}
      {program === 'hivcare' && monthlyAdherenceTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Monthly Adherence Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Showed vs missed refills per month (last 12 months)</p>
            </div>
            <ToggleGroup type="single" value={adherenceTrendView} onValueChange={(v) => v && setAdherenceTrendView(v as ViewMode)} size="sm" className="border border-border rounded-md mt-2 md:mt-0">
              <ToggleGroupItem value="table" aria-label="Table view"><LayoutList className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="bar" aria-label="Bar chart"><BarChart3 className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="line" aria-label="Line chart"><LineIcon className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            {adherenceTrendView === 'table' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Showed</TableHead>
                    <TableHead className="text-right">Missed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyAdherenceTrend.map(row => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{row.showed}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">{row.missed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : adherenceTrendView === 'line' ? (
              <ChartContainer config={{ showed: { label: 'Showed', color: 'hsl(142, 70%, 40%)' }, missed: { label: 'Missed', color: 'hsl(0, 75%, 50%)' } }} className="h-[250px] w-full">
                <LineChart data={monthlyAdherenceTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="showed" stroke="hsl(142, 70%, 40%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="missed" stroke="hsl(0, 75%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            ) : (
              <ChartContainer config={{ showed: { label: 'Showed', color: 'hsl(142, 70%, 40%)' }, missed: { label: 'Missed', color: 'hsl(0, 75%, 50%)' } }} className="h-[250px] w-full">
                <BarChart data={monthlyAdherenceTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="showed" fill="hsl(142, 70%, 40%)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="missed" fill="hsl(0, 75%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disease Burden */}
      {diseaseBurdenData.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Disease Burden by Sex</CardTitle>
              <p className="text-xs text-muted-foreground">Patient count per program by gender</p>
            </div>
            {/* Data view options for Disease Burden */}
            <ToggleGroup type="single" value={diseaseBurdenView} onValueChange={(v) => v && setDiseaseBurdenView(v as ViewMode)} size="sm" className="border border-border rounded-md mt-2 md:mt-0">
              <ToggleGroupItem value="table" aria-label="Table view"><LayoutList className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="bar" aria-label="Bar chart"><BarChart3 className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="pie" aria-label="Pie chart"><PieIcon className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="line" aria-label="Line chart"><LineIcon className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            {renderDataView(
              diseaseBurdenData.map(row => ({ name: row.name, count: row.male + row.female })),
              'Program',
              diseaseBurdenView
            )}
          </CardContent>
        </Card>
      )}

      {/* Line List by Location */}
      {locationData.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Line List by Location</CardTitle>
              <p className="text-xs text-muted-foreground">Number of cases per location</p>
            </div>
            {/* Data view options for Location */}
            <ToggleGroup type="single" value={locationView} onValueChange={(v) => v && setLocationView(v as ViewMode)} size="sm" className="border border-border rounded-md mt-2 md:mt-0">
              <ToggleGroupItem value="table" aria-label="Table view"><LayoutList className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="bar" aria-label="Bar chart"><BarChart3 className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="pie" aria-label="Pie chart"><PieIcon className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="line" aria-label="Line chart"><LineIcon className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            {renderDataView(locationData.map(l => ({ ...l, fill: 'hsl(var(--primary))' })), 'Location', locationView)}
          </CardContent>
        </Card>
      )}

      {/* Yearly Trend */}
      {period === 'yearly' && monthlyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Trend ({selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            {renderDataView(
              monthlyTrend.map(row => ({ name: row.month, count: row.registered })),
              'Monthly Trend',
              monthlyTrendView
            )}
          </CardContent>
        </Card>
      )}

      {patients.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Icon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">No patient data available for reporting.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
