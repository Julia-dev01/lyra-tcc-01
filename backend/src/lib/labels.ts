import type { AgressorArma, TipoViolencia } from './types';
import { blindIndex } from './crypto';

export const TIPO_VIOLENCIA_LABEL: Record<TipoViolencia, string> = {
  FISICA: 'Física',
  PSICOLOGICA: 'Psicológica',
  SEXUAL: 'Sexual',
  PATRIMONIAL: 'Patrimonial',
  MORAL: 'Moral',
  OUTRA: 'Outra',
  PREFIRO_NAO_INFORMAR: 'Prefiro não informar agora',
};

export const AGRESSOR_ARMA_LABEL: Record<AgressorArma, string> = {
  SIM: 'Sim',
  NAO: 'Não',
  NAO_SEI: 'Não sei',
};

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

export function labelTipo(value: TipoViolencia | null | undefined): string {
  if (!value) return '';
  return TIPO_VIOLENCIA_LABEL[value] ?? String(value);
}

export function labelArma(value: AgressorArma | null | undefined): string {
  if (!value) return '';
  return AGRESSOR_ARMA_LABEL[value] ?? String(value);
}

// Mapeia um blind index de volta ao rotulo correspondente, sem revelar o
// conteudo cifrado no banco. Usado nas estatisticas anonimizadas.
export function resolveTipoByBidx(bidx: string): string {
  for (const [code, label] of Object.entries(TIPO_VIOLENCIA_LABEL)) {
    if (blindIndex(code) === bidx) return label;
  }
  return 'Outra';
}

export function resolveArmaByBidx(bidx: string): string {
  for (const [code, label] of Object.entries(AGRESSOR_ARMA_LABEL)) {
    if (blindIndex(code) === bidx) return label;
  }
  return 'Não sei';
}
