import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { applyDisguise, isDisguiseEnabled, setDisguiseEnabled } from '../lib/disguise';

interface DisguiseContextValue {
  enabled: boolean;
  unlocked: boolean;
  setEnabled: (value: boolean) => void;
  unlock: () => void;
  lock: () => void;
}

const DisguiseContext = createContext<DisguiseContextValue | undefined>(undefined);

export function DisguiseProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(() => isDisguiseEnabled());
  const [unlocked, setUnlocked] = useState(() => !isDisguiseEnabled());

  useEffect(() => {
    applyDisguise(enabled);
  }, [enabled]);

  const setEnabled = useCallback((value: boolean) => {
    setDisguiseEnabled(value);
    setEnabledState(value);
    setUnlocked(!value);
  }, []);

  const unlock = useCallback(() => setUnlocked(true), []);
  const lock = useCallback(() => {
    if (enabled) setUnlocked(false);
  }, [enabled]);

  const value = useMemo(
    () => ({ enabled, unlocked, setEnabled, unlock, lock }),
    [enabled, unlocked, setEnabled, unlock, lock],
  );

  return <DisguiseContext.Provider value={value}>{children}</DisguiseContext.Provider>;
}

export function useDisguise() {
  const ctx = useContext(DisguiseContext);
  if (!ctx) throw new Error('useDisguise precisa do DisguiseProvider');
  return ctx;
}
