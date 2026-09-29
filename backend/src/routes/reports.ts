import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/http';
import { requireAdmin, requireRole } from '../middleware/auth';
import { resolveArmaByBidx, resolveTipoByBidx } from '../lib/labels';
import { recordAudit } from '../services/audit';

export const reportsRouter = Router();

reportsRouter.use(requireAdmin, requireRole('SUPER_ADMIN', 'ATENDENTE'));

function toCsv(rows: Array<Record<string, string | number | boolean>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | boolean) => {
    const str = String(value);
    return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(';')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(';'));
  }
  return lines.join('\n');
}

// Relatorio anonimizado de usuarias (sem nome, contato ou endereco).
reportsRouter.get(
  '/users.csv',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { excluidoEm: null },
      orderBy: { criadoEm: 'desc' },
    });
    const rows = users.map((u) => ({
      id: u.id,
      tipo_violencia: resolveTipoByBidx(u.tipoViolenciaBidx),
      agressor_arma: resolveArmaByBidx(u.agressorArmaBidx),
      consentimento_lgpd: u.consentimentoLgpd,
      criado_em: u.criadoEm.toISOString(),
    }));
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'RELATORIO_USUARIAS_CSV',
      entidade: 'User',
      req,
    });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="usuarias-anonimizado.csv"');
    res.send('\uFEFF' + toCsv(rows));
  }),
);

reportsRouter.get(
  '/alerts.csv',
  asyncHandler(async (req, res) => {
    const alerts = await prisma.alert.findMany({ orderBy: { criadoEm: 'desc' } });
    const rows = alerts.map((a) => ({
      id: a.id,
      status: a.status,
      prioridade: a.prioridade,
      arma_presente: a.armaPresente,
      tem_geolocalizacao: a.latitude != null && a.longitude != null,
      encaminhado_para: a.encaminhadoPara ?? '',
      criado_em: a.criadoEm.toISOString(),
    }));
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'RELATORIO_ALERTAS_CSV',
      entidade: 'Alert',
      req,
    });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="alertas-anonimizado.csv"');
    res.send('\uFEFF' + toCsv(rows));
  }),
);

// Relatorio resumido em PDF (dados agregados, sem dado pessoal).
reportsRouter.get(
  '/summary.pdf',
  asyncHandler(async (req, res) => {
    const activeStatuses = ['NOVO', 'EM_ATENDIMENTO', 'ENCAMINHADO'] as const;
    const [totalUsuarias, alertasAtivos, comArma, chatsAbertos, porTipo] =
      await Promise.all([
        prisma.user.count({ where: { excluidoEm: null } }),
        prisma.alert.count({ where: { status: { in: activeStatuses as never } } }),
        prisma.alert.count({
          where: { status: { in: activeStatuses as never }, armaPresente: true },
        }),
        prisma.chatSession.count({ where: { NOT: { status: 'ENCERRADA' } } }),
        prisma.user.groupBy({
          by: ['tipoViolenciaBidx'],
          where: { excluidoEm: null },
          _count: { _all: true },
        }),
      ]);

    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'RELATORIO_RESUMO_PDF',
      entidade: 'Report',
      req,
    });

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'attachment; filename="resumo-anonimizado.pdf"');

    const doc = new PDFDocument({ margin: 48 });
    doc.pipe(res);
    doc.fontSize(18).text('Alerta Segura - Relatorio anonimizado', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
    doc.moveDown();
    doc.fontSize(12).text(`Total de cadastros ativos: ${totalUsuarias}`);
    doc.text(`Alertas ativos: ${alertasAtivos}`);
    doc.text(`Alertas ativos com indicio de arma: ${comArma}`);
    doc.text(`Conversas abertas: ${chatsAbertos}`);
    doc.moveDown();
    doc.fontSize(13).text('Distribuicao por tipo de violencia:');
    doc.moveDown(0.5);
    for (const row of porTipo) {
      doc
        .fontSize(11)
        .text(`- ${resolveTipoByBidx(row.tipoViolenciaBidx)}: ${row._count._all}`);
    }
    doc.moveDown();
    doc
      .fontSize(9)
      .fillColor('#555555')
      .text(
        'Este relatorio nao contem dados pessoais. Acesso registrado em log de auditoria imutavel.',
      );
    doc.end();
  }),
);
