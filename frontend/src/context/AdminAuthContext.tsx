import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { get, post } from '../lib/api';
import type { AdminDTO } from '../lib/types';

interface AdminAuthContextValue {
  admin: AdminDTO | null;
  loading: boolean;
  setAdmin: (admin: AdminDTO | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await get<{ admin: AdminDTO }>('/api/admin/auth/me');
      setAdmin(data.admin);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await post('/api/admin/auth/logout');
    } catch {
      /* ignore */
    }
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, loading, setAdmin, refresh, logout }),
    [admin, loading, refresh, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth precisa do AdminAuthProvider');
  return ctx;
}
