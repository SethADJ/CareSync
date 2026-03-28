import { useState, useMemo } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { useLogs } from '@/hooks/useLogs';
import { getProgramLabel } from '@/utils/program-logic';
import { db, type ProgramType } from '@/db/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Heart, Baby, Users as UsersIcon, FileText, Table2, BarChart3, PieChart as PieIcon, LineChart as LineIcon, LayoutList, TrendingUp, TrendingDown, Users, UserCheck, UserX, Calendar, Download, Activity, RefreshCw } from 'lucide-react';
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
  tbcare: Shield, 
  hivcare: Heart,
  epi: Baby,
  anc: UsersIcon,
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
  // Start year dropdown from 2026 (or current year if later)
  const baseYear = Math.max(2026, new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(String(baseYear));
  // Individual view modes for each report section
  const [monthlyTrendView, setMonthlyTrendView] = useState<ViewMode>('bar');
  const [genderView, setGenderView] = useState<ViewMode>('bar');
  const [tbTypeView, setTbTypeView] = useState<ViewMode>('bar');
  const [adherenceView, setAdherenceView] = useState<ViewMode>('bar');
  const [adherenceTrendView, setAdherenceTrendView] = useState<ViewMode>('bar');
  const [diseaseBurdenView, setDiseaseBurdenView] = useState<ViewMode>('bar');
  const [locationView, setLocationView] = useState<ViewMode>('bar');
  const [refreshCounter, setRefreshCounter] = useState(0);

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
    // Summary sheet
    const summarySheet = XLSX.utils.json_to_sheet(buildSummaryData());
    
    // Location sheet
    const locationSheet = XLSX.utils.json_to_sheet(locationData.map(l => ({ Location: l.name, Cases: l.count })));
    
    // Patient details sheet - comprehensive tabular data
    const patientDetails = patients.map(p => ({
      'System ID': p.systemId,
      'Patient Name': p.name,
      'Sex': p.sex || 'Unknown',
      'Phone': p.phone || '',
      'Facility': p.facility || '',
      'Location': p.location || '',
      'Date Registered': p.dateRegistered ? format(parseISO(p.dateRegistered), 'yyyy-MM-dd') : '',
      'Status': p.status || 'active',
      'Next Due Date': p.nextDueDate ? format(parseISO(p.nextDueDate), 'yyyy-MM-dd') : '',
      ...(program === 'tbcare' ? {
        'TB Type': p.tbType ? TB_TYPE_LABELS[p.tbType] || p.tbType : '',
        'TB Start Date': p.tbStartDate ? format(parseISO(p.tbStartDate), 'yyyy-MM-dd') : '',
        'TB Current Cycle': p.tbCurrentCycle || '',
        'TB Extra Pulmonary Site': p.tbExtraPulmonarySite || '',
      } : {}),
      ...(program === 'hivcare' ? {
        'ART Start Date': p.artStartDate ? format(parseISO(p.artStartDate), 'yyyy-MM-dd') : '',
        'ART Regimen': p.artRegimen || '',
        'CD4 Count': p.cd4Count || '',
        'Viral Load': p.viralLoad || '',
        'HIV Refill Interval': p.hivRefillInterval || '',
      } : {}),
    }));
    const patientSheet = XLSX.utils.json_to_sheet(patientDetails);
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 12 }, // System ID
      { wch: 20 }, // Patient Name
      { wch: 8 },  // Sex
      { wch: 15 }, // Phone
      { wch: 20 }, // Facility
      { wch: 20 }, // Location
      { wch: 12 }, // Date Registered
      { wch: 10 }, // Status
      { wch: 12 }, // Next Due Date
    ];
    
    if (program === 'tbcare') {
      colWidths.push(
        { wch: 25 }, // TB Type
        { wch: 12 }, // TB Start Date
        { wch: 15 }, // TB Current Cycle
        { wch: 25 }  // TB Extra Pulmonary Site
      );
    } else if (program === 'hivcare') {
      colWidths.push(
        { wch: 12 }, // ART Start Date
        { wch: 15 }, // ART Regimen
        { wch: 10 }, // CD4 Count
        { wch: 12 }, // Viral Load
        { wch: 18 }  // HIV Refill Interval
      );
    }
    
    patientSheet['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(wb, locationSheet, 'By Location');
    XLSX.utils.book_append_sheet(wb, patientSheet, 'Patient Details');
    
    if (program === 'tbcare' && tbTypeData.length > 0) {
      const tbSheet = XLSX.utils.json_to_sheet(tbTypeData.map(t => ({ 'TB Type': t.name, Count: t.count })));
      XLSX.utils.book_append_sheet(wb, tbSheet, 'TB Types');
    }
    
    if (program === 'hivcare' && adherenceData.length > 0) {
      const adherenceSheet = XLSX.utils.json_to_sheet(adherenceData.map(a => ({ Status: a.name, Count: a.count })));
      XLSX.utils.book_append_sheet(wb, adherenceSheet, 'Adherence Summary');
    }
    
    if (program === 'hivcare' && monthlyAdherenceTrend.length > 0) {
      const trendSheet = XLSX.utils.json_to_sheet(monthlyAdherenceTrend.map(t => ({ Month: t.month, Showed: t.showed, Missed: t.missed })));
      XLSX.utils.book_append_sheet(wb, trendSheet, 'Monthly Adherence Trend');
    }
    
    XLSX.writeFile(wb, `${getProgramLabel(program)}_Report_${dateRange.label.replace(/\s/g, '_')}.xlsx`);
  };

  // Only show 2026 as the app launch year—do not include years before that
  const years = ['2026'];

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
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg border p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{getProgramLabel(program)} Analytics</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Comprehensive reporting dashboard for {dateRange.label}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            {/* Period Selection */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Period:</label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value as Period)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex-1 sm:flex-none"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            {/* Date Selection */}
            {period === 'monthly' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
              />
            )}
            {period === 'yearly' && (
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => setRefreshCounter(c => c + 1)}
              title="Refresh report data"
              className="h-9 px-3 rounded-md border border-input bg-background hover:bg-accent text-foreground flex items-center gap-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            
            {/* Export Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button size="sm" variant="outline" onClick={downloadPDF} className="flex items-center gap-2 flex-1 sm:flex-none">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button size="sm" variant="outline" onClick={downloadExcel} className="flex items-center gap-2 flex-1 sm:flex-none">
                <Table2 className="h-4 w-4" />
                <span className="hidden sm:inline">Export Excel</span>
                <span className="sm:hidden">Excel</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-900">Patient Registry</p>
                <p className="text-xl md:text-2xl font-bold text-blue-900">{stats.total} patients</p>
                <p className="text-xs text-blue-700 mt-1">
                  {stats.newRegistered} new in {dateRange.label}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-900">Program Performance</p>
                <p className="text-xl md:text-2xl font-bold text-green-900">
                  {(() => {
                    const totalDueForRefill = dueInPeriod.length;
                    const activePatientIds = new Set(patients.map(p => p.id));
                    const totalShowedUp = new Set(
                      logs.filter(l =>
                        l.action === 'follow-up-call' &&
                        activePatientIds.has(l.patientId) &&
                        isWithinInterval(parseISO(l.date), { start: dateRange.start, end: dateRange.end })
                      ).map(l => l.patientId)
                    ).size;
                    const adherenceRate = totalDueForRefill > 0 ? Math.round((totalShowedUp / totalDueForRefill) * 100) : 0;
                    return `${adherenceRate}%`;
                  })()} adherence
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Based on follow-up completion rates
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <UserX className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-amber-900">Risk Monitoring</p>
                <p className="text-xl md:text-2xl font-bold text-amber-900">{stats.overdue} defaulters</p>
                <p className="text-xs text-amber-700 mt-1">
                  Patients requiring immediate attention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          
          const summaryItems = [
            { 
              label: 'Total Patients', 
              value: stats.total, 
              icon: Users, 
              color: 'text-blue-600', 
              bgColor: 'bg-blue-50',
              trend: null
            },
            { 
              label: 'Due for Refill', 
              value: totalDueForRefill, 
              icon: Calendar, 
              color: 'text-amber-600', 
              bgColor: 'bg-amber-50',
              trend: null
            },
            { 
              label: 'Showed Up', 
              value: totalShowedUp, 
              icon: UserCheck, 
              color: 'text-green-600', 
              bgColor: 'bg-green-50',
              trend: adherenceRate >= 80 ? 'up' : adherenceRate >= 60 ? 'neutral' : 'down'
            },
            { 
              label: 'Defaulters', 
              value: defaulters, 
              icon: UserX, 
              color: 'text-red-600', 
              bgColor: 'bg-red-50',
              trend: defaulterRate <= 20 ? 'down' : defaulterRate <= 40 ? 'neutral' : 'up'
            },
            { 
              label: 'Adherence Rate', 
              value: `${adherenceRate}%`, 
              icon: Activity, 
              color: adherenceRate >= 80 ? 'text-green-600' : adherenceRate >= 60 ? 'text-amber-600' : 'text-red-600', 
              bgColor: adherenceRate >= 80 ? 'bg-green-50' : adherenceRate >= 60 ? 'bg-amber-50' : 'bg-red-50',
              trend: adherenceRate >= 80 ? 'up' : adherenceRate >= 60 ? 'neutral' : 'down'
            },
            { 
              label: 'Defaulter Rate', 
              value: `${defaulterRate}%`, 
              icon: TrendingDown, 
              color: defaulterRate <= 20 ? 'text-green-600' : defaulterRate <= 40 ? 'text-amber-600' : 'text-red-600', 
              bgColor: defaulterRate <= 20 ? 'bg-green-50' : defaulterRate <= 40 ? 'bg-amber-50' : 'bg-red-50',
              trend: defaulterRate <= 20 ? 'down' : defaulterRate <= 40 ? 'neutral' : 'up'
            },
          ];
          
          return summaryItems.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${item.bgColor}`}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    {item.trend && (
                      <div className={`flex items-center ${
                        item.trend === 'up' ? 'text-green-600' : 
                        item.trend === 'down' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {item.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                         item.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : 
                         <Activity className="h-3 w-3" />}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{item.value}</p>
                    <p className={`text-xs font-medium mt-1 ${item.color}`}>{item.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ));
        })()}
      </div>

      {/* Data Insights */}
      {patients.length > 0 && (
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-600" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const totalDueForRefill = dueInPeriod.length;
                const activePatientIds = new Set(patients.map(p => p.id));
                const totalShowedUp = new Set(
                  logs.filter(l =>
                    l.action === 'follow-up-call' &&
                    activePatientIds.has(l.patientId) &&
                    isWithinInterval(parseISO(l.date), { start: dateRange.start, end: dateRange.end })
                  ).map(l => l.patientId)
                ).size;
                const adherenceRate = totalDueForRefill > 0 ? Math.round((totalShowedUp / totalDueForRefill) * 100) : 0;
                const defaulters = patients.filter(p => p.status === 'overdue' && p.nextDueDate && isWithinInterval(parseISO(p.nextDueDate), { start: dateRange.start, end: dateRange.end })).length;
                
                const insights = [];
                
                // Adherence insight
                if (adherenceRate >= 80) {
                  insights.push({
                    icon: TrendingUp,
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    title: 'Excellent Adherence',
                    description: `${adherenceRate}% of patients are adhering to their treatment schedule.`
                  });
                } else if (adherenceRate >= 60) {
                  insights.push({
                    icon: Activity,
                    color: 'text-amber-600',
                    bgColor: 'bg-amber-50',
                    title: 'Moderate Adherence',
                    description: `${adherenceRate}% adherence rate indicates room for improvement.`
                  });
                } else {
                  insights.push({
                    icon: TrendingDown,
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    title: 'Low Adherence',
                    description: `Only ${adherenceRate}% adherence - immediate intervention needed.`
                  });
                }
                
                // Defaulter insight
                if (defaulters > 0) {
                  insights.push({
                    icon: UserX,
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    title: 'Defaulter Alert',
                    description: `${defaulters} patients require immediate follow-up attention.`
                  });
                }
                
                // New registrations insight
                if (stats.newRegistered > 0) {
                  insights.push({
                    icon: Users,
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    title: 'New Registrations',
                    description: `${stats.newRegistered} new patients joined ${dateRange.label}.`
                  });
                }
                
                // Gender distribution insight
                const genderRatio = stats.female > 0 ? Math.round((stats.male / stats.female) * 100) / 100 : 0;
                if (genderRatio > 1.5) {
                  insights.push({
                    icon: Users,
                    color: 'text-purple-600',
                    bgColor: 'bg-purple-50',
                    title: 'Gender Distribution',
                    description: `Male patients outnumber females ${genderRatio}:1 in this cohort.`
                  });
                }
                
                return insights.slice(0, 3).map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/50 border">
                    <div className={`p-2 rounded-lg ${insight.bgColor} flex-shrink-0`}>
                      <insight.icon className={`h-4 w-4 ${insight.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts / Tables */}
      {patients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Gender Distribution
                </CardTitle>
                <p className="text-xs text-muted-foreground">Patient demographics by gender</p>
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    TB Classification
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Distribution of tuberculosis types</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tbTypeData.map(t => (
                      <span key={t.name} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-muted rounded-full">
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Refill Adherence Summary
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Patient compliance with antiretroviral therapy refills</p>
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
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Monthly Adherence Trend
              </CardTitle>
              <p className="text-xs text-muted-foreground">12-month trend of ART refill compliance</p>
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
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Disease Burden by Sex
              </CardTitle>
              <p className="text-xs text-muted-foreground">Comparative analysis across healthcare programs</p>
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
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Geographic Distribution
              </CardTitle>
              <p className="text-xs text-muted-foreground">Patient distribution across locations</p>
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
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              There are no patients registered in the {getProgramLabel(program)} program yet. 
              Start by adding patients to generate comprehensive analytics and reports.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" size="sm" asChild>
                <a href={`/${program}`}>Add Patients</a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="/profile">Import Data</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
