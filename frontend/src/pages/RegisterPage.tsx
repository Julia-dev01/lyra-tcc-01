import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { Field, SelectField } from '../components/Field';
import { NoticeCard } from '../components/NoticeCard';
import { post, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ARMA_OPTIONS, TIPO_VIOLENCIA_OPTIONS } from '../lib/types';

const schema = z.object({
  nomeCompleto: z.string().trim().min(2, 'Informe seu nome completo'),
  endereco: z.string().trim().min(3, 'Informe seu endereço completo'),
  tipoViolencia: z.enum([
    'FISICA',
    'PSICOLOGICA',
    'SEXUAL',
    'PATRIMONIAL',
    'MORAL',
    'OUTRA',
    'PREFIRO_NAO_INFORMAR',
  ], { required_error: 'Selecione o tipo de violência' }),
  agressorArma: z.enum(['SIM', 'NAO', 'NAO_SEI'], {
    required_error: 'Informe se o agressor tem arma',
  }),
  temFamiliar: z.enum(['SIM', 'NAO'], {
    required_error: 'Informe se existe familiar para contato',
  }),
  telefoneFamiliar: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.temFamiliar === 'SIM') {
    const telefone = data.telefoneFamiliar?.replace(/\D/g, '') ?? '';
    if (!telefone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['telefoneFamiliar'],
        message: 'Informe o número do familiar para contato de emergência',
      });
    } else if (telefone.length < 10 || telefone.length > 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['telefoneFamiliar'],
        message: 'Informe um número de telefone válido',
      });
    }
  }
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      nomeCompleto: '',
      endereco: '',
      tipoViolencia: '' as FormValues['tipoViolencia'],
      agressorArma: '' as FormValues['agressorArma'],
      temFamiliar: '' as FormValues['temFamiliar'],
      telefoneFamiliar: '',
    },
  });

  const temFamiliar = watch('temFamiliar');

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      const data = await post<{ user: import('../lib/types').UserDTO }>('/api/auth/register', values);
      setUser(data.user);
      setDone(true);
      window.setTimeout(() => navigate('/'), 900);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Não foi possível concluir o cadastro.');
    }
  };

  return (
    <PageShell title="Cadastro de Usuário" subtitle="Seus dados são protegidos e usados só para o apoio">
      <form className="space-y-1" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          label="Nome completo"
          required
          placeholder="Digite seu nome completo"
          autoComplete="name"
          error={errors.nomeCompleto?.message}
          {...register('nomeCompleto')}
        />
        <Field
          label="Endereço"
          required
          placeholder="Digite seu endereço completo"
          autoComplete="street-address"
          error={errors.endereco?.message}
          {...register('endereco')}
        />
        <SelectField
          label="Selecione o tipo de violência"
          required
          error={errors.tipoViolencia?.message}
          {...register('tipoViolencia')}
        >
          <option value="" disabled>
            Selecione
          </option>
          {TIPO_VIOLENCIA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="O agressor tem algum tipo de arma?"
          required
          error={errors.agressorArma?.message}
          {...register('agressorArma')}
        >
          <option value="" disabled>
            Selecione
          </option>
          {ARMA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Existe algum familiar para contato de emergência?"
          error={errors.temFamiliar?.message}
          {...register('temFamiliar')}
        >
          <option value="" disabled>
            Selecione
          </option>
          <option value="SIM">Sim</option>
          <option value="NAO">Não</option>
        </SelectField>

        {temFamiliar === 'SIM' && (
          <div className="mb-4 rounded-2xl border border-secondary/30 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-primary">Contato de emergência</p>
            <Field
              label="Número do familiar para contato de emergência"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              hint="Informe o número de telefone do familiar que poderá ser contatado em uma emergência."
              error={errors.telefoneFamiliar?.message}
              {...register('telefoneFamiliar')}
            />
          </div>
        )}

        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-secondary/30 bg-white px-3 py-3 text-sm text-primary">
          <ShieldCheck size={18} aria-hidden />
          Informações protegidas
        </div>

        <NoticeCard title="Privacidade e Segurança">
          Seus dados ficam protegidos e são usados apenas para oferecer apoio neste sistema. Em um
          pedido de ajuda, a equipe autorizada pode ver o necessário para encaminhar o atendimento.
        </NoticeCard>

        {done && (
          <p className="mt-3 text-sm font-semibold text-success" role="status">
            Cadastro concluído. Vamos para a tela inicial.
          </p>
        )}
        {serverError && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {serverError}
          </p>
        )}

        <button type="submit" className="btn-primary mt-5 w-full min-h-[52px] text-lg" disabled={isSubmitting || done}>
          {isSubmitting ? 'Concluindo…' : 'Concluir cadastro'}
        </button>
      </form>
    </PageShell>
  );
}
