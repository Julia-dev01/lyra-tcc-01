# Alerta Segura

Plataforma web de apoio e denuncia de violencia domestica. Interface em portugues do Brasil, mobile-first, com saida rapida, modo disfarce, chat anonimo e area administrativa com 2FA.

## Requisitos

- Node.js 20+
- PostgreSQL 16 (ou Docker)

## Instalacao

```bash
cp .env.example .env
```

Gere as chaves e substitua os valores `REPLACE_WITH_*` no `.env`:

```bash
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 48
```

Copie o mesmo `.env` para `backend/.env` (o servidor le esse arquivo).

```bash
docker compose up -d db
npm install
npm run setup
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3001
- Admin: http://localhost:5173/admin/login

## Super Admin inicial

- E-mail: `superadmin@alertasegura.local`
- Senha: `AlertaSegura#2026`
- No primeiro acesso e obrigatorio trocar a senha e cadastrar TOTP (2FA).

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run db:migrate
npm run db:seed
```

Backup cifrado (requer `gpg`):

```bash
npm run backup --workspace backend
```

## Seguranca

Leia `docs/SEGURANCA.md`.

Dados sensiveis (nome, contato, endereco, tipo de violencia, arma e mensagens) sao persistidos com AES-256-GCM. Senhas e PINs usam Argon2id.

## Aviso

A integracao real com Policia e ONGs exige convenio. O `AlertDispatcher` inicia em modo simulado.
