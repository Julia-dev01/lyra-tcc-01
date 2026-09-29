import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { get, put } from '../../lib/api';
import { ALERT_STATUS_LABEL, PRIORIDADE_LABEL, type AlertStatus } from '../../lib/types';

interface AlertRow {
  id: string;
  status: AlertStatus;
  prioridade: string;
  armaPresente: boolean;
  latitude: number | null;
  longitude: number | null;
  encaminhadoPara: string | null;
  notas: string | null;
  criadoEm: string;
  usuaria: { id: string; nome: string; contato: string; tipoViolencia: string };
}

export function AdminAlerts() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<AlertRow | null>(null);

  const load = () => {
    const q = filter ? `?status=${filter}` : '';
    void get<AlertRow[]>(`/api/admin/alerts${q}`).then(setAlerts);
  };

  useEffect(() => {
    load();
    const socket = io({ withCredentials: true });
    socket.on('alert:new', () => load());
    return () => {
      socket.disconnect();
    };
  }, [filter]);

  const update = async (id: string, body: Record<string, unknown>) => {
    await put(`/api/admin/alerts/${id}`, body);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['', 'NOVO', 'EM_ATENDIMENTO', 'ENCAMINHADO', 'RESOLVIDO'].map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-full px-3 py-2 text-sm ${filter === s ? 'bg-primary text-white' : 'bg-white'}`}
            onClick={() => setFilter(s)}
          >
            {s ? ALERT_STATUS_LABEL[s] : 'Todos'}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-3xl bg-white shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b text-secondary">
              <th className="p-3">Quando</th>
              <th className="p-3">Usuária</th>
              <th className="p-3">Prioridade</th>
              <th className="p-3">Status</th>
              <th className="p-3">Mapa</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="p-3">{new Date(a.criadoEm).toLocaleString('pt-BR')}</td>
                <td className="p-3">
                  <button type="button" className="underline" onClick={() => setSelected(a)}>
                    {a.usuaria.nome}
                  </button>
                  {a.armaPresente && <span className="ml-2 rounded-full bg-danger/15 px-2 py-0.5 text-danger">Arma</span>}
                </td>
                <td className="p-3">{PRIORIDADE_LABEL[a.prioridade] ?? a.prioridade}</td>
                <td className="p-3">
                  <select
                    className="field py-1"
                    value={a.status}
                    onChange={(e) => void update(a.id, { status: e.target.value })}
                  >
                    {Object.entries(ALERT_STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  {a.latitude != null ? (
                    <a
                      className="underline"
                      href={`https://www.openstreetmap.org/?mlat=${a.latitude}&mlon=${a.longitude}#map=16/${a.latitude}/${a.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver mapa
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="card space-y-2">
          <h2 className="font-bold">Ficha do alerta</h2>
          <p>Usuária: {selected.usuaria.nome}</p>
          <p>Contato: {selected.usuaria.contato}</p>
          <p>Tipo: {selected.usuaria.tipoViolencia}</p>
          <label className="label">Encaminhado para</label>
          <input
            className="field"
            defaultValue={selected.encaminhadoPara ?? ''}
            onBlur={(e) => void update(selected.id, { encaminhadoPara: e.target.value })}
          />
          <label className="label">Notas</label>
          <textarea
            className="field"
            defaultValue={selected.notas ?? ''}
            onBlur={(e) => void update(selected.id, { notas: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
