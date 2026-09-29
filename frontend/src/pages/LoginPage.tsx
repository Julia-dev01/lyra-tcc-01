import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { Field } from '../components/Field';
import { post, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { UserDTO } from '../lib/types';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ contato: string; secret: string }>();

  const onSubmit = async (values: { contato: string; secret: string }) => {
    setServerError('');
    try {
      const data = await post<{ user: UserDTO }>('/api/auth/login', values);
      setUser(data.user);
      navigate('/');
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Não foi possível entrar.');
    }
  };

  return (
    <PageShell title="Entrar" subtitle="Acesso para cadastros com contato e PIN" backTo="/">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="E-mail ou telefone" required error={errors.contato?.message} {...register('contato', { required: 'Informe o contato' })} />
        <Field
          label="PIN ou senha"
          type="password"
          required
          error={errors.secret?.message}
          {...register('secret', { required: 'Informe o PIN ou senha' })}
        />
        {serverError && (
          <p className="text-sm text-danger" role="alert">
            {serverError}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          Entrar
        </button>
        <p className="text-center text-sm">
          Ainda não tem cadastro?{' '}
          <Link to="/cadastro" className="font-semibold underline">
            Criar cadastro
          </Link>
        </p>
      </form>
    </PageShell>
  );
}
