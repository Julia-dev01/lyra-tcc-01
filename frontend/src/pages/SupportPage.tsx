import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { NoticeCard } from '../components/NoticeCard';
import { get } from '../lib/api';
import type { ContentPage, EmergencyNumber, Ngo } from '../lib/types';

export function SupportPage() {
  const [numbers, setNumbers] = useState<EmergencyNumber[]>([]);
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [pages, setPages] = useState<ContentPage[]>([]);

  useEffect(() => {
    void Promise.all([
      get<EmergencyNumber[]>('/api/emergency-numbers'),
      get<Ngo[]>('/api/content/ngos'),
      get<ContentPage[]>('/api/content/pages'),
    ]).then(([n, g, p]) => {
      setNumbers(n);
      setNgos(g);
      setPages(p);
    });
  }, []);

  const psico = pages.filter((p) => p.tipo === 'PSICOLOGICA');
  const jurid = pages.filter((p) => p.tipo === 'JURIDICA');

  return (
    <PageShell title="Apoio e Informações" subtitle="Recursos gratuitos e objetivos" backTo="/">
      <div className="space-y-4">
        <section className="card">
          <h2 className="mb-3 font-bold">Telefones de Emergência</h2>
          <ul className="space-y-1 text-sm">
            {numbers.map((n) => (
              <li key={n.numero}>
                <a href={`tel:${n.numero}`} className="flex min-h-[44px] items-center gap-2">
                  <Phone size={16} aria-hidden />
                  <strong>{n.numero}</strong> {n.nome}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">ONGs Parceiras</h2>
          <ul className="space-y-3 text-sm">
            {ngos.map((n) => (
              <li key={n.id}>
                <p className="font-semibold">{n.nome}</p>
                {n.descricao && <p className="text-secondary">{n.descricao}</p>}
                {n.telefone && (
                  <a href={`tel:${n.telefone}`} className="underline">
                    {n.telefone}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Orientações Psicológicas</h2>
          {psico.map((p) => (
            <article key={p.id} className="mb-3 text-sm last:mb-0">
              <h3 className="font-semibold">{p.titulo}</h3>
              <p className="text-secondary">{p.resumo || p.conteudo}</p>
            </article>
          ))}
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Orientações Jurídicas</h2>
          {jurid.map((p) => (
            <article key={p.id} className="mb-3 text-sm last:mb-0">
              <h3 className="font-semibold">{p.titulo}</h3>
              <p className="text-secondary">{p.resumo || p.conteudo}</p>
            </article>
          ))}
        </section>

        <NoticeCard title="Dica Importante">
          Todos os recursos são gratuitos e privados. Você não está sozinho(a).
        </NoticeCard>

        <Link to="/chat" className="btn-primary flex w-full min-h-[52px]">
          Conversar agora
        </Link>
      </div>
    </PageShell>
  );
}
