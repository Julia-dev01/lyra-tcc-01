import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env';
import { hashSecret } from '../src/lib/argon';
import { buildUserData } from '../src/services/users';

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const email = env.SUPER_ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.info('[seed] Super Admin ja existe, mantendo.');
    return;
  }
  const senhaHash = await hashSecret(env.SUPER_ADMIN_PASSWORD);
  await prisma.admin.create({
    data: {
      nome: env.SUPER_ADMIN_NAME,
      email,
      senhaHash,
      perfil: 'SUPER_ADMIN',
      ativo: true,
      precisaTrocarSenha: true,
      totpHabilitado: false,
    },
  });
  console.info('[seed] Super Admin inicial criado (troca de senha e 2FA obrigatorios).');
}

async function seedContent() {
  const ngoCount = await prisma.ngo.count();
  if (ngoCount === 0) {
    await prisma.ngo.createMany({
      data: [
        {
          nome: 'Casa da Mulher Brasileira',
          descricao:
            'Acolhimento, orientação e encaminhamento para mulheres em situação de violência.',
          telefone: '180',
          cidade: 'Brasília',
          uf: 'DF',
          site: 'https://www.gov.br/mulheres',
          ordem: 1,
        },
        {
          nome: 'Defensoria Pública - Núcleo da Mulher',
          descricao: 'Orientação jurídica gratuita e medidas protetivas.',
          telefone: '0800 123 4567',
          cidade: 'São Paulo',
          uf: 'SP',
          ordem: 2,
        },
        {
          nome: 'Rede de Apoio Regional',
          descricao: 'Grupos de apoio e acompanhamento psicológico comunitário.',
          telefone: '(11) 3333-0000',
          cidade: 'Campinas',
          uf: 'SP',
          ordem: 3,
        },
      ],
    });
    console.info('[seed] ONGs parceiras de exemplo criadas.');
  }

  const pageCount = await prisma.contentPage.count();
  if (pageCount === 0) {
    await prisma.contentPage.createMany({
      data: [
        {
          tipo: 'JURIDICA',
          titulo: 'Lei Maria da Penha e medidas protetivas',
          resumo: 'O que a lei garante e como pedir uma medida protetiva de urgência.',
          conteudo:
            'A Lei Maria da Penha (Lei 11.340/2006) cria mecanismos para coibir a violência doméstica e familiar. ' +
            'Você pode solicitar medidas protetivas de urgência diretamente na delegacia, no Ministério Público ou ' +
            'na Defensoria Pública, mesmo sem advogado. As medidas podem incluir afastamento do agressor, proibição ' +
            'de contato e restrição de visitação aos filhos. O atendimento é gratuito.',
          ordem: 1,
        },
        {
          tipo: 'PSICOLOGICA',
          titulo: 'Como cuidar da sua saúde emocional',
          resumo: 'Sinais de alerta e onde buscar apoio psicológico gratuito.',
          conteudo:
            'Sentir medo, ansiedade ou tristeza é uma reação comum diante da violência. Você não é culpada pelo que ' +
            'está acontecendo. Buscar apoio psicológico ajuda a recuperar a autonomia e a segurança. ' +
            'O Sistema Único de Saúde (SUS) oferece acolhimento e acompanhamento psicossocial gratuitamente nos CAPS e ' +
            'nas unidades básicas.',
          ordem: 2,
        },
        {
          tipo: 'OUTRA',
          titulo: 'Plano de segurança pessoal',
          resumo: 'Passos práticos para se proteger em situações de risco.',
          conteudo:
            'Tenha à mão documentos importantes e um telefone de confiança. Combine uma palavra-código com alguém de ' +
            'confiança. Memorize os números 190, 180 e 100. Salve contatos de apoio com nomes discretos no celular. ' +
            'Se precisar sair rápido, use o botão Saída rápida do aplicativo.',
          ordem: 3,
        },
      ],
    });
    console.info('[seed] Orientações de exemplo criadas.');
  }

  const settings = [
    { key: 'anon_chat_notice', value: String(env.ANON_CHAT_TTL_HOURS) },
    { key: 'quick_exit_url', value: 'https://www.climatempo.com.br/' },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      create: s,
      update: {},
    });
  }
}

async function seedDemoData() {
  if (process.env.SEED_DEMO !== 'true') return;
  const existing = await prisma.user.count();
  if (existing > 0) return;

  const demo = [
    {
      nomeCompleto: 'Maria Souza (exemplo)',
      apelido: 'Mari',
      contato: 'maria.exemplo@teste.local',
      endereco: 'Rua das Flores, 100 - Exemplo',
      tipoViolencia: 'FISICA' as const,
      agressorArma: 'SIM' as const,
    },
    {
      nomeCompleto: 'Ana Lima (exemplo)',
      contato: 'ana.exemplo@teste.local',
      endereco: 'Av. Central, 250 - Exemplo',
      tipoViolencia: 'PSICOLOGICA' as const,
      agressorArma: 'NAO' as const,
    },
  ];
  for (const d of demo) {
    await prisma.user.create({
      data: buildUserData(
        {
          nomeCompleto: d.nomeCompleto,
          apelido: d.apelido ?? null,
          contato: d.contato,
          endereco: d.endereco,
          tipoViolencia: d.tipoViolencia,
          agressorArma: d.agressorArma,
          consentimentoLgpd: true,
          contatos: [
            { nome: 'Contato de confiança', telefone: '+55 11 90000-0000', tipo: 'FAMILIAR' },
          ],
        },
        await hashSecret('123456'),
      ),
    });
  }
  console.info('[seed] Dados de demonstracao criados (SEED_DEMO=true).');
}

async function main() {
  await seedSuperAdmin();
  await seedContent();
  await seedDemoData();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('[seed] erro:', err instanceof Error ? err.name : err);
    await prisma.$disconnect();
    process.exit(1);
  });
