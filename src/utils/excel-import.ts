import * as XLSX from 'xlsx';
import type { Patient, ProgramType } from '@/db/database';
import { generateSystemId } from '@/utils/system-id';

const TB_TEMPLATE_COLUMNS = [
  'Patient Name',
  'Sex (male/female)',
  'Phone Number',
  'Health Facility',
  'Residential Location / Town',
  'Type of TB (pulmonary-positive / pulmonary-negative / extra-pulmonary / mdr)',
  'Extra-Pulmonary Site (if applicable)',
  'TB Treatment Start Date (YYYY-MM-DD)',
];

export function downloadTBTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TB_TEMPLATE_COLUMNS, [
    'John Doe', 'male', '812345678', 'City Hospital', 'Soweto',
    'pulmonary-positive', '', '2026-01-15',
  ]]);

  // Set column widths
  ws['!cols'] = TB_TEMPLATE_COLUMNS.map(h => ({ wch: Math.max(h.length, 20) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TBCare Patients');
  XLSX.writeFile(wb, 'TBCare_Patient_Template.xlsx');
}

const TB_TYPES = ['pulmonary-positive', 'pulmonary-negative', 'extra-pulmonary', 'mdr'] as const;

export function parseTBExcel(file: File): Promise<Omit<Patient, 'id'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
          reject(new Error('File is empty or has no data rows'));
          return;
        }

        // Validate template headers
        const headers = (rows[0] || []).map((h: any) => String(h).trim());
        const expectedStart = ['Patient Name', 'Sex (male/female)', 'Phone Number'];
        const headersMatch = expectedStart.every((col, i) => headers[i]?.toLowerCase() === col.toLowerCase());
        if (!headersMatch) {
          reject(new Error('Unauthorized format: This file does not match the official CareSync TBCare template. Please download and use the correct template.'));
          return;
        }

        // Skip header row
        const patients: Omit<Patient, 'id'>[] = [];
        const errors: string[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(c => !c)) continue; // skip empty rows

          const name = String(row[0] || '').trim();
          if (!name) { errors.push(`Row ${i + 1}: Missing name`); continue; }

          const sex = String(row[1] || '').trim().toLowerCase();
          if (sex && sex !== 'male' && sex !== 'female') {
            errors.push(`Row ${i + 1}: Sex must be 'male' or 'female'`);
            continue;
          }

          const phone = String(row[2] || '').trim();
          const facility = String(row[3] || '').trim();
          const location = String(row[4] || '').trim();

          const tbTypeRaw = String(row[5] || '').trim().toLowerCase();
          const tbType = TB_TYPES.includes(tbTypeRaw as any) ? tbTypeRaw as Patient['tbType'] : undefined;

          const extraSite = String(row[6] || '').trim();
          const startDate = String(row[7] || '').trim();

          const systemId = generateSystemId(name, 'tbcare');

          patients.push({
            systemId,
            name,
            sex: (sex as 'male' | 'female') || undefined,
            phone,
            program: 'tbcare' as ProgramType,
            dateRegistered: new Date().toISOString(),
            facility: facility || undefined,
            location: location || undefined,
            tbType,
            tbExtraPulmonarySite: tbType === 'extra-pulmonary' ? extraSite : undefined,
            tbStartDate: startDate || undefined,
            tbCurrentCycle: 1,
            tbAttendance: {},
          });
        }

        if (patients.length === 0) {
          reject(new Error(errors.length ? errors.join('\n') : 'No valid patient data found'));
          return;
        }

        resolve(patients);
      } catch (err) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
