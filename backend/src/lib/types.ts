// Tipos de dominio usados pela aplicacao. As colunas correspondentes sao
// persistidas cifradas (AES-256-GCM); por isso nao sao campos enum do Prisma.

export type TipoViolencia =
  | 'FISICA'
  | 'PSICOLOGICA'
  | 'SEXUAL'
  | 'PATRIMONIAL'
  | 'MORAL'
  | 'OUTRA'
  | 'PREFIRO_NAO_INFORMAR';

export type AgressorArma = 'SIM' | 'NAO' | 'NAO_SEI';

export type EmergencyContactType = 'FAMILIAR' | 'ONG' | 'POLICIA';
