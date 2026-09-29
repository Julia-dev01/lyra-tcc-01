import { z } from 'zod';

export const tipoViolenciaEnum = z.enum([
  'FISICA',
  'PSICOLOGICA',
  'SEXUAL',
  'PATRIMONIAL',
  'MORAL',
  'OUTRA',
  'PREFIRO_NAO_INFORMAR',
]);

export const agressorArmaEnum = z.enum(['SIM', 'NAO', 'NAO_SEI']);
export const contactTypeEnum = z.enum(['FAMILIAR', 'ONG', 'POLICIA']);
export const alertStatusEnum = z.enum([
  'NOVO',
  'EM_ATENDIMENTO',
  'ENCAMINHADO',
  'RESOLVIDO',
]);
export const adminPerfilEnum = z.enum(['SUPER_ADMIN', 'ATENDENTE', 'MODERADOR']);
export const contentTypeEnum = z.enum(['PSICOLOGICA', 'JURIDICA', 'OUTRA']);

// PIN numerico de 6 digitos OU senha com no minimo 8 caracteres.
const secretSchema = z
  .string()
  .min(6, 'Informe um PIN de 6 dígitos ou uma senha de 8+ caracteres')
  .max(72, 'Limite de 72 caracteres')
  .refine(
    (v) => /^\d{6}$/.test(v) || v.length >= 8,
    'Use um PIN de 6 dígitos ou uma senha com pelo menos 8 caracteres',
  );

const contatoSchema = z
  .string()
  .trim()
  .min(5, 'Informe um e-mail ou telefone válido')
  .refine(
    (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || /^\+?[\d\s()-]{8,}$/.test(v),
    'Informe um e-mail ou telefone válido',
  );

export const emergencyContactInput = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do contato').max(120),
  telefone: z.string().trim().min(8, 'Informe um telefone válido').max(30),
  tipo: contactTypeEnum,
});

export const userRegisterSchema = z.object({
  nomeCompleto: z.string().trim().min(2, 'Informe seu nome ou apelido').max(120),
  apelido: z.string().trim().max(120).optional().nullable(),
  contato: contatoSchema,
  secret: secretSchema,
  endereco: z.string().trim().min(3, 'Informe seu endereço').max(300),
  tipoViolencia: tipoViolenciaEnum,
  agressorArma: agressorArmaEnum,
  consentimentoLgpd: z.boolean().optional(),
  contatos: z.array(emergencyContactInput).max(10).optional(),
});

export const publicRegisterSchema = z.object({
  nomeCompleto: z.string().trim().min(2, 'Informe seu nome completo').max(120),
  endereco: z.string().trim().min(3, 'Informe seu endereço').max(300),
  tipoViolencia: tipoViolenciaEnum,
  agressorArma: agressorArmaEnum,
  temFamiliar: z.enum(['SIM', 'NAO']),
  telefoneFamiliar: z.string().trim().max(30).optional(),
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

export const userLoginSchema = z.object({
  contato: contatoSchema,
  secret: z.string().min(1, 'Informe seu PIN ou senha'),
});

export const captchaSchema = z.object({
  captchaId: z.string().min(1),
  captchaAnswer: z.string().min(1),
});

export const alertCreateSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  origem: z.enum(['USUARIA', 'ANONIMO']).optional(),
});

export const userUpdateSchema = z.object({
  nomeCompleto: z.string().trim().min(2).max(120).optional(),
  apelido: z.string().trim().max(120).nullable().optional(),
  contato: contatoSchema.optional(),
  endereco: z.string().trim().min(3).max(300).optional(),
  tipoViolencia: tipoViolenciaEnum.optional(),
  agressorArma: agressorArmaEnum.optional(),
  secret: secretSchema.optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
  codigoTotp: z.string().trim().optional(),
});

export const totpVerifySchema = z.object({
  codigoTotp: z.string().trim().min(6).max(6),
  pendingToken: z.string().min(10),
});

export const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1).optional(),
  novaSenha: z.string().min(8, 'A nova senha precisa de 8+ caracteres').max(72),
});

export const adminCreateSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().email('E-mail inválido'),
  perfil: adminPerfilEnum,
});

export const adminUpdateSchema = z.object({
  nome: z.string().trim().min(2).max(120).optional(),
  perfil: adminPerfilEnum.optional(),
  ativo: z.boolean().optional(),
});

export const adminFirstAccessSchema = z.object({
  token: z.string().min(10),
  novaSenha: z.string().min(8).max(72),
});

export const alertUpdateSchema = z.object({
  status: alertStatusEnum.optional(),
  encaminhadoPara: z.string().trim().max(200).nullable().optional(),
  notas: z.string().trim().max(2000).nullable().optional(),
});

export const chatTokenSchema = z.object({
  token: z.string().min(10),
});

export const chatMessageSchema = z.object({
  conteudo: z.string().trim().min(1, 'Digite uma mensagem').max(4000),
  token: z.string().min(10).optional(),
});

export const ngoSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  descricao: z.string().trim().max(1000).nullable().optional(),
  telefone: z.string().trim().max(40).nullable().optional(),
  cidade: z.string().trim().max(120).nullable().optional(),
  uf: z.string().trim().length(2).nullable().optional(),
  site: z.string().trim().max(300).nullable().optional(),
  ativo: z.boolean().optional(),
  ordem: z.number().int().optional(),
});

export const contentPageSchema = z.object({
  tipo: contentTypeEnum,
  titulo: z.string().trim().min(2).max(200),
  resumo: z.string().trim().max(500).nullable().optional(),
  conteudo: z.string().trim().min(2).max(20000),
  ordem: z.number().int().optional(),
  publicado: z.boolean().optional(),
});
