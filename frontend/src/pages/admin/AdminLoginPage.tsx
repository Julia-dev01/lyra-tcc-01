import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { HeroHeader } from '../../components/HeroHeader';
import { Field } from '../../components/Field';
import { post, ApiError } from '../../lib/api';
import { useAdminAuth } from '../../context/AdminAuthContext';
import type { AdminDTO } from '../../lib/types';

type Step = 'login' | 'change-password' | 'enroll-totp' | 'totp';

interface LoginResponse {
  step: Step | 'done';
  pendingToken?: string;
  admin?: AdminDTO;
  secret?: string;
  qrDataUrl?: string;
}

export function AdminLoginPage() {
  const { setAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const invite = params.get('token');

  const [step, setStep] = useState<Step>(invite ? 'change-password' : 'login');
  const [pending, setPending] = useState(invite ?? '');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const finish = (admin: AdminDTO) => {
    setAdmin(admin);
    navigate('/admin');
  };

  const handleError = (err: unknown) => {
    setError(err instanceof ApiError ? err.message : 'Não foi possível continuar.');
  };

  const login = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await post<LoginResponse>('/api/admin/auth/login', { email, senha });
      if (data.step === 'done' && data.admin) return finish(data.admin);
      setPending(data.pendingToken ?? '');
      setStep(data.step as Step);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setError('');
    setLoading(true);
    try {
      if (invite) {
        const data = await post<LoginResponse>('/api/admin/auth/first-access', {
          token: invite,
          novaSenha,
        });
        setPending(data.pendingToken ?? '');
        setStep('enroll-totp');
      } else {
        const data = await post<LoginResponse>('/api/admin/auth/change-password', {
          pendingToken: pending,
          novaSenha,
        });
        setPending(data.pendingToken ?? '');
        setStep(data.step as Step);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const setupTotp = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await post<{ qrDataUrl: string; secret: string }>('/api/admin/auth/totp/setup', {
        pendingToken: pending,
      });
      setQr(data.qrDataUrl);
      setSecret(data.secret);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmTotp = async () => {
    setError('');
    setLoading(true);
    try {
      const path = step === 'enroll-totp' ? '/api/admin/auth/totp/confirm' : '/api/admin/auth/verify-2fa';
      const data = await post<LoginResponse>(path, { pendingToken: pending, codigoTotp: codigo });
      if (data.admin) finish(data.admin);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg">
      <HeroHeader title="Área administrativa" subtitle="Acesso restrito com senha e 2FA" />
      <div className="space-y-4 px-4 py-6">
        {step === 'login' && (
          <>
            <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Field label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            <button type="button" className="btn-primary w-full" disabled={loading} onClick={() => void login()}>
              Continuar
            </button>
          </>
        )}
        {step === 'change-password' && (
          <>
            <p className="text-sm">Defina uma nova senha para o primeiro acesso.</p>
            <Field
              label="Nova senha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
            <button type="button" className="btn-primary w-full" disabled={loading} onClick={() => void changePassword()}>
              Salvar senha
            </button>
          </>
        )}
        {step === 'enroll-totp' && (
          <>
            <p className="text-sm">Cadastre o autenticador (Google Authenticator, Authy ou similar).</p>
            {!qr ? (
              <button type="button" className="btn-primary w-full" onClick={() => void setupTotp()}>
                Gerar QR Code
              </button>
            ) : (
              <>
                <img src={qr} alt="QR Code do autenticador" className="mx-auto h-48 w-48" />
                <p className="break-all text-center text-xs text-secondary">{secret}</p>
                <Field
                  label="Código de 6 dígitos"
                  inputMode="numeric"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
                <button type="button" className="btn-primary w-full" disabled={loading} onClick={() => void confirmTotp()}>
                  Confirmar 2FA
                </button>
              </>
            )}
          </>
        )}
        {step === 'totp' && (
          <>
            <Field
              label="Código do autenticador"
              inputMode="numeric"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
            <button type="button" className="btn-primary w-full" disabled={loading} onClick={() => void confirmTotp()}>
              Verificar
            </button>
          </>
        )}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Link to="/" className="block text-center text-sm underline">
          Voltar ao app
        </Link>
      </div>
    </div>
  );
}
