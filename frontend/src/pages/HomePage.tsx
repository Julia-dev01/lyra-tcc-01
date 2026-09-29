import { Link } from 'react-router-dom';
import { Phone, Settings } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { useAuth } from '../context/AuthContext';

const NUMBERS = [
  { n: '190', label: 'Polícia' },
  { n: '192', label: 'SAMU' },
  { n: '193', label: 'Bombeiros' },
];

export function HomePage() {
  const { user } = useAuth();

  return (
    <PageShell
      title="Alerta Segura"
      subtitle="Sua segurança em primeiro lugar"
      right={
        <Link
          to="/configuracoes"
          className="mt-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/15"
          aria-label="Configurações"
        >
          <Settings size={22} />
        </Link>
      }
    >
      <div className="space-y-5">
        {user && (
          <p className="text-sm text-secondary">Olá, {user.nomeCompleto.split(' ')[0]}.</p>
        )}

        <div>
          <Link
            to={user ? '/alerta' : '/cadastro'}
            className="btn-primary flex w-full min-h-[64px] text-xl"
          >
            Pedir ajuda agora
          </Link>
          <p className="mt-2 text-center text-sm text-secondary">Emergência imediata</p>
        </div>

        <div>
          <Link to="/apoio" className="btn-secondary flex w-full min-h-[56px]">
            Apoio e informações
          </Link>
          <p className="mt-2 text-center text-sm text-secondary">Recursos e orientações</p>
        </div>

        <section className="card">
          <h2 className="mb-3 text-base font-bold">Em caso de emergência real, ligue:</h2>
          <div className="grid grid-cols-3 gap-2">
            {NUMBERS.map((item) => (
              <a
                key={item.n}
                href={`tel:${item.n}`}
                className="flex min-h-[64px] flex-col items-center justify-center rounded-2xl bg-cream py-3 text-primary"
              >
                <Phone size={16} aria-hidden />
                <strong className="text-lg">{item.n}</strong>
                <span className="text-xs">{item.label}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
