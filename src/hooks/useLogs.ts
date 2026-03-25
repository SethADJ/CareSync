import { useState, useEffect, useCallback } from 'react';
import { db, type TrackingLog, type ProgramType } from '@/db/database';

const logsEventTarget = new EventTarget();

export const broadcastLogsChange = () => {
  logsEventTarget.dispatchEvent(new Event('logs-changed'));
};

export function useLogs(program?: ProgramType) {
  const [logs, setLogs] = useState<TrackingLog[]>([]);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => {
    const all = db.getLogs();
    const filtered = program ? all.filter(l => l.program === program) : all;
    setLogs(filtered);
  }, [program]);

  useEffect(() => { reload(); }, [reload, version]);

  useEffect(() => {
    const listener = () => setVersion(v => v + 1);
    logsEventTarget.addEventListener('logs-changed', listener);
    return () => logsEventTarget.removeEventListener('logs-changed', listener);
  }, []);

  const addLog = useCallback((log: Omit<TrackingLog, 'id'>) => {
    db.addLog(log);
    setVersion(v => v + 1);
    broadcastLogsChange();
  }, []);

  return {
    logs,
    addLog,
  };
}
