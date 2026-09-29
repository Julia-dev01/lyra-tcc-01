import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { get } from '../../lib/api';

interface Dashboard {
  alertasAtivos: number;
  alertasComArma: number;
  totalCadastros: number;
  chatsAbertos: number;
  graficoTipo: Array<{ tipo: string; total: number }>;
  graficoPeriodo: Array<{ dia: string; total: number }>;
}

export function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    void get<Dashboard>('/api/admin/dashboard').then(setData);
  }, []);

  if (!data) return <p>Carregando painel…</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Alertas ativos" value={data.alertasAtivos} />
        <Stat label="Com arma" value={data.alertasComArma} highlight />
        <Stat label="Cadastros" value={data.totalCadastros} />
        <Stat label="Chats abertos" value={data.chatsAbertos} />
      </div>
      <section className="card">
        <h2 className="mb-3 font-bold">Alertas nos últimos 14 dias</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.graficoPeriodo}>
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#525871" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card">
        <h2 className="mb-3 font-bold">Cadastros por tipo de violência</h2>
        <ul className="space-y-1 text-sm">
          {data.graficoTipo.map((t) => (
            <li key={t.tipo} className="flex justify-between">
              <span>{t.tipo}</span>
              <strong>{t.total}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`card ${highlight ? 'ring-2 ring-danger' : ''}`}>
      <p className="text-sm text-secondary">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
