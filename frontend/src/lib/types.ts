export type TipoViolencia =
  | 'FISICA'
  | 'PSICOLOGICA'
  | 'SEXUAL'
  | 'PATRIMONIAL'
  | 'MORAL'
  | 'OUTRA'
  | 'PREFIRO_NAO_INFORMAR';

export type AgressorArma = 'SIM' | 'NAO' | 'NAO_SEI';
export type ContactType = 'FAMILIAR' | 'ONG' | 'POLICIA';
export type AlertStatus = 'NOVO' | 'EM_ATENDIMENTO' | 'ENCAMINHADO' | 'RESOLVIDO';
export type AlertPriority = 'ALTA' | 'MEDIA' | 'BAIXA';
export type AdminPerfil = 'SUPER_ADMIN' | 'ATENDENTE' | 'MODERADOR';
export type ChatSender = 'USUARIA' | 'ESPECIALISTA' | 'SISTEMA';
export type ChatStatus = 'ABERTA' | 'EM_ATENDIMENTO' | 'ENCERRADA';
export type ContentType = 'PSICOLOGICA' | 'JURIDICA' | 'OUTRA';

export interface EmergencyContact {
  id: string;
  nome: string;
  telefone: string;
  tipo: ContactType | string;
}

export interface UserDTO {
  id: string;
  nomeCompleto: string;
  apelido: string | null;
  contato: string;
  endereco: string;
  tipoViolencia: string;
  tipoViolenciaCodigo: TipoViolencia;
  agressorArma: string;
  agressorArmaCodigo: AgressorArma;
  consentimentoLgpd: boolean;
  consentimentoData: string | null;
  criadoEm: string;
  atualizadoEm: string;
  excluidoEm: string | null;
  contatosEmergencia?: EmergencyContact[];
}

export interface AdminDTO {
  id: string;
  nome: string;
  email: string;
  perfil: AdminPerfil;
  totpHabilitado: boolean;
  precisaTrocarSenha: boolean;
  ultimoLogin: string | null;
  ativo?: boolean;
  criadoEm?: string;
}

export interface ChatMessage {
  id: string;
  remetente: ChatSender | string;
  conteudo: string;
  criadoEm: string;
}

export interface Ngo {
  id: string;
  nome: string;
  descricao?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  uf?: string | null;
  site?: string | null;
  ativo: boolean;
  ordem: number;
}

export interface ContentPage {
  id: string;
  tipo: ContentType | string;
  titulo: string;
  resumo?: string | null;
  conteudo: string;
  ordem: number;
  publicado: boolean;
}

export interface EmergencyNumber {
  numero: string;
  nome: string;
  descricao: string;
}

export const TIPO_VIOLENCIA_OPTIONS: Array<{ value: TipoViolencia; label: string }> = [
  { value: 'FISICA', label: 'Física' },
  { value: 'PSICOLOGICA', label: 'Psicológica' },
  { value: 'SEXUAL', label: 'Sexual' },
  { value: 'PATRIMONIAL', label: 'Patrimonial' },
  { value: 'MORAL', label: 'Moral' },
  { value: 'OUTRA', label: 'Outra' },
  { value: 'PREFIRO_NAO_INFORMAR', label: 'Prefiro não informar agora' },
];

export const ARMA_OPTIONS: Array<{ value: AgressorArma; label: string }> = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
  { value: 'NAO_SEI', label: 'Não sei' },
];

export const CONTACT_TYPE_OPTIONS: Array<{ value: ContactType; label: string }> = [
  { value: 'FAMILIAR', label: 'Familiar' },
  { value: 'ONG', label: 'ONG' },
  { value: 'POLICIA', label: 'Polícia' },
];

export const ALERT_STATUS_LABEL: Record<string, string> = {
  NOVO: 'Novo',
  EM_ATENDIMENTO: 'Em atendimento',
  ENCAMINHADO: 'Encaminhado',
  RESOLVIDO: 'Resolvido',
};

export const PRIORIDADE_LABEL: Record<string, string> = {
  ALTA: 'Alta',
  MEDIA: 'Média',
  BAIXA: 'Baixa',
};

export const PERFIL_LABEL: Record<AdminPerfil, string> = {
  SUPER_ADMIN: 'Super Admin',
  ATENDENTE: 'Atendente',
  MODERADOR: 'Moderador de conteúdo',
};
