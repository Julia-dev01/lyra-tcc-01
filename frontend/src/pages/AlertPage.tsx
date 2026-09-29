import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { post, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

async function getLocation(): Promise<{ latitude?: number; longitude?: number }> {
  if (!navigator.geolocation) return {};
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

export function AlertPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'sending' | 'sent' | 'offline'>('idle');
  const [count, setCount] = useState(3);
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!user) navigate('/cadastro', { replace: true });
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [user, navigate]);

  const startConfirm = () => {
    setError('');
    setCount(3);
    setPhase('confirm');
    timer.current = window.setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          if (timer.current) window.clearInterval(timer.current);
          void sendAlert();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const cancel = () => {
    if (timer.current) window.clearInterval(timer.current);
    setPhase('idle');
    setCount(3);
  };

  const sendAlert = async (attempt = 1) => {
    setPhase('sending');
    if (!navigator.onLine) {
      setPhase('offline');
      return;
    }
    try {
      const loc = await getLocation();
      await post('/api/alerts', loc);
      setPhase('sent');
    } catch (err) {
      if (attempt < 3 && navigator.onLine) {
        window.setTimeout(() => void sendAlert(attempt + 1), 1200 * attempt);
        return;
      }
      if (!navigator.onLine) {
        setPhase('offline');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar o alerta.');
      setPhase('idle');
    }
  };

  return (
    <PageShell
      title="Alerta de Emergência"
      subtitle="Envie um pedido de ajuda para os contatos configurados"
      icon="alert"
      backTo="/"
    >
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-secondary">
          Use este botão se precisar de ajuda agora. Seus contatos cadastrados e a equipe de apoio
          serão notificados.
        </p>

        {phase === 'sent' && (
          <div className="rounded-3xl bg-success/15 p-4 text-success" role="status">
            <p className="font-bold">Alerta enviado com sucesso!</p>
            <p className="mt-1 text-sm">Seus contatos foram notificados.</p>
          </div>
        )}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {phase === 'offline' && (
          <div className="notice-card">
            Sem conexão. Disque 190 agora.
            <a href="tel:190" className="btn-primary mt-3 flex w-full">
              Ligar 190
            </a>
          </div>
        )}

        {phase === 'confirm' ? (
          <div className="card text-center">
            <p className="text-lg font-bold">Enviando em {count}…</p>
            <p className="mt-1 text-sm text-secondary">Toque em cancelar se foi um toque acidental.</p>
            <button type="button" className="btn-ghost mt-4 w-full" onClick={cancel}>
              Cancelar
            </button>
          </div>
        ) : phase === 'sent' ? (
          <button type="button" className="w-full rounded-2xl bg-success px-5 py-4 text-lg font-bold text-white" disabled>
            Alerta Enviado
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary w-full min-h-[64px] text-lg"
            onClick={startConfirm}
            disabled={phase === 'sending'}
          >
            {phase === 'sending' ? 'Enviando…' : 'Enviar alerta imediato'}
          </button>
        )}

        <Link to="/chat" className="btn-secondary flex w-full min-h-[52px] gap-2">
          <MessageCircle size={18} aria-hidden />
          Chat anônimo
        </Link>
        <p className="text-center text-sm text-secondary">Converse com um especialista</p>

        <p className="text-center text-sm text-secondary">
          Ou ligue diretamente:{' '}
          <a href="tel:190" className="font-semibold underline">
            190
          </a>
          {' · '}
          <a href="tel:192" className="font-semibold underline">
            192
          </a>
          {' · '}
          <a href="tel:193" className="font-semibold underline">
            193
          </a>
        </p>
      </div>
    </PageShell>
  );
}
