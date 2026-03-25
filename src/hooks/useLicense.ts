import { useState, useCallback } from 'react';
import { db } from '@/db/database';

const VALID_KEYS = ['CARESYNC-PRO-2024', 'CARESYNC-CLINIC-2024', 'CARESYNC-DEMO'];

export function useLicense() {
  const [version, setVersion] = useState(0);
  const license = db.getLicense();

  const isActivated = !!license;
  const activatedModules = license?.modules ?? [];

  const isModuleUnlocked = useCallback((_module: string) => {
    // TB and HIV are always unlocked
    return true;
  }, []);

  const activate = useCallback(async (key: string): Promise<boolean> => {
    const trimmed = key.trim().toUpperCase();
    if (VALID_KEYS.includes(trimmed)) {
      db.saveLicense({
        key: trimmed,
        activatedAt: new Date().toISOString(),
        modules: [],
      });
      setVersion(v => v + 1);
      return true;
    }
    return false;
  }, []);

  const deactivate = useCallback(async () => {
    db.clearLicense();
    setVersion(v => v + 1);
  }, []);

  return { isActivated, activatedModules, isModuleUnlocked, activate, deactivate, isLoading: false };
}
