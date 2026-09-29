import type { EmergencyContact, Prisma, User } from '@prisma/client';
import type { AgressorArma, TipoViolencia } from '../lib/types';
import { decryptField, encryptField, blindIndex, tokenizeForSearch } from '../lib/crypto';
import { labelArma, labelTipo } from '../lib/labels';

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
  contatosEmergencia?: EmergencyContactDTO[];
}

export interface EmergencyContactDTO {
  id: string;
  nome: string;
  telefone: string;
  tipo: string;
}

export function toUserDTO(
  user: User & { emergencyContacts?: EmergencyContact[] },
): UserDTO {
  const tipo = (decryptField(user.tipoViolenciaEnc) as TipoViolencia | null) ?? null;
  const arma = (decryptField(user.agressorArmaEnc) as AgressorArma | null) ?? null;
  return {
    id: user.id,
    nomeCompleto: decryptField(user.nomeCompletoEnc) ?? '',
    apelido: decryptField(user.apelidoEnc),
    contato: decryptField(user.contatoEnc) ?? '',
    endereco: decryptField(user.enderecoEnc) ?? '',
    tipoViolencia: labelTipo(tipo),
    tipoViolenciaCodigo: tipo as TipoViolencia,
    agressorArma: labelArma(arma),
    agressorArmaCodigo: arma as AgressorArma,
    consentimentoLgpd: user.consentimentoLgpd,
    consentimentoData: user.consentimentoData?.toISOString() ?? null,
    criadoEm: user.criadoEm.toISOString(),
    atualizadoEm: user.atualizadoEm.toISOString(),
    excluidoEm: user.excluidoEm?.toISOString() ?? null,
    contatosEmergencia: user.emergencyContacts?.map((c) => ({
      id: c.id,
      nome: decryptField(c.nomeEnc) ?? '',
      telefone: decryptField(c.telefoneEnc) ?? '',
      tipo: c.tipo,
    })),
  };
}

export interface CreateUserInput {
  nomeCompleto: string;
  apelido?: string | null;
  contato: string;
  endereco: string;
  tipoViolencia: TipoViolencia;
  agressorArma: AgressorArma;
  consentimentoLgpd: boolean;
  contatos?: Array<{
    nome: string;
    telefone: string;
    tipo: 'FAMILIAR' | 'ONG' | 'POLICIA';
  }>;
}

// Monta os campos cifrados + indices cegos do registro de usuaria.
export function buildUserData(
  input: CreateUserInput,
  pinHash: string,
): Prisma.UserCreateInput {
  return {
    nomeCompletoEnc: encryptField(input.nomeCompleto) as string,
    apelidoEnc: encryptField(input.apelido ?? null),
    contatoEnc: encryptField(input.contato) as string,
    contatoBidx: blindIndex(input.contato),
    searchTokens: tokenizeForSearch(input.nomeCompleto, input.apelido ?? null),
    pinHash,
    enderecoEnc: encryptField(input.endereco) as string,
    tipoViolenciaEnc: encryptField(input.tipoViolencia) as string,
    tipoViolenciaBidx: blindIndex(input.tipoViolencia),
    agressorArmaEnc: encryptField(input.agressorArma) as string,
    agressorArmaBidx: blindIndex(input.agressorArma),
    consentimentoLgpd: input.consentimentoLgpd,
    consentimentoData: input.consentimentoLgpd ? new Date() : null,
    emergencyContacts: input.contatos?.length
      ? {
          create: input.contatos.map((c) => ({
            nomeEnc: encryptField(c.nome) as string,
            telefoneEnc: encryptField(c.telefone) as string,
            tipo: c.tipo,
          })),
        }
      : undefined,
  };
}
