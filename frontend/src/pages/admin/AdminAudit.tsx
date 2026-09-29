import { useEffect, useState } from 'react';
import { get } from '../../lib/api';

interface Log {
  id: string;
  admin: string;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  ip: string | null;
  criadoEm: string;
}

export function AdminAudit() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void get<{ logs: Log[]; total: number }>(`/api/admin/audit?page=${page}`).then((d) => {
      setLogs(d.logs);
      setTotal(d.total);
    });
  }, [page]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-secondary">Log imutável · {total} registros</p>
      <div className="overflow-x-auto rounded-3xl bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b text-secondary">
              <th className="p-3">Quando</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Ação</th>
              <th className="p-3">Entidade</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="p-3">{new Date(l.criadoEm).toLocaleString('pt-BR')}</td>
                <td className="p-3">{l.admin}</td>
                <td className="p-3">{l.acao}</td>
                <td className="p-3">{l.entidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </button>
        <button type="button" className="btn-ghost" onClick={() => setPage((p) => p + 1)}>
          Próxima
        </button>
      </div>
    </div>
  );
}
