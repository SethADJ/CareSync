import { useState, useEffect, useCallback, useMemo } from 'react';
import { db, type Patient, type ProgramType } from '@/db/database';
import { calculateNextDue } from '@/utils/program-logic';
import { generateSystemId } from '@/utils/system-id';

const patientsEventTarget = new EventTarget();

export const broadcastPatientsChange = () => {
  patientsEventTarget.dispatchEvent(new Event('patients-changed'));
};

type UsePatientsResult = {
  patients: Patient[];
  dueToday: Patient[];
  overdue: Patient[];
  isLoading: boolean;
  addPatient: (patient: Omit<Patient, 'id'>) => Promise<void>;
  updatePatient: (id: string, changes: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  reload: () => void;
};

export function usePatients(program?: ProgramType): UsePatientsResult {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => {
    if (!program) {
      setPatients([]);
      return;
    }
    const all = db.getPatients(program);
    // Backfill system IDs for patients that don't have one
    all.forEach(p => {
      if ((!p.systemId || !p.systemId.startsWith('TB/') && !p.systemId.startsWith('HIV/') && !p.systemId.startsWith('EPI/') && !p.systemId.startsWith('ANC/')) && p.name) {
        p.systemId = generateSystemId(p.name, p.program);
        db.updatePatient(p.id, { systemId: p.systemId, program: p.program });
      }
    });
    setPatients(all.map(calculateNextDue));
  }, [program]);

  useEffect(() => {
    reload();
  }, [program, reload, version]);

  useEffect(() => {
    const listener = () => setVersion(v => v + 1);
    patientsEventTarget.addEventListener('patients-changed', listener);
    return () => {
      patientsEventTarget.removeEventListener('patients-changed', listener);
    };
  }, []);

  const dueToday = useMemo(() => patients.filter(p => p.status === 'due'), [patients]);
  const overdue = useMemo(() => patients.filter(p => p.status === 'overdue'), [patients]);

  const addPatient = useCallback(async (patient: Omit<Patient, 'id'>) => {
    if (!program) return;
    const enriched = calculateNextDue({ ...patient, program } as Patient);
    db.addPatient(enriched);
    setVersion(v => v + 1);
    broadcastPatientsChange();
  }, [program]);

  const updatePatient = useCallback(async (id: string, changes: Partial<Patient>) => {
    if (!program) return;
    const all = db.getPatients(program);
    const existing = all.find(p => p.id === id);
    if (!existing) return;
    const updated = calculateNextDue({ ...existing, ...changes });
    db.updatePatient(id, updated);
    setVersion(v => v + 1);
    broadcastPatientsChange();
  }, [program]);

  const deletePatient = useCallback(async (id: string) => {
    if (!program) return;
    db.deletePatient(id, program);
    setVersion(v => v + 1);
    broadcastPatientsChange();
  }, [program]);

  return {
    patients,
    dueToday,
    overdue,
    isLoading: false,
    addPatient,
    updatePatient,
    deletePatient,
    reload,
  };
}
