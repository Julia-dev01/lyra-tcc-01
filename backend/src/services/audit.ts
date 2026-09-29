import type { Request } from 'express';
import { prisma } from '../lib/prisma';
import { clientIp } from '../middleware/auth';

interface AuditInput {
  adminId?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  req?: Request;
  detalhes?: Record<string, unknown>;
}

// Log de auditoria imutavel. Nunca gravar dados sensiveis em "detalhes"
// (apenas identificadores e metadados de acao).
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: input.adminId ?? null,
        acao: input.acao,
        entidade: input.entidade,
        entidadeId: input.entidadeId ?? null,
        ip: input.req ? clientIp(input.req) : null,
        userAgent: input.req?.get('user-agent')?.slice(0, 200) ?? null,
        detalhes: input.detalhes ? JSON.stringify(input.detalhes) : null,
      },
    });
  } catch {
    // Auditoria nunca deve derrubar a requisicao principal.
    console.error('[audit] falha ao registrar evento');
  }
}
