-- CreateEnum
CREATE TYPE "TipoViolencia" AS ENUM ('FISICA', 'PSICOLOGICA', 'SEXUAL', 'PATRIMONIAL', 'MORAL', 'OUTRA', 'PREFIRO_NAO_INFORMAR');

-- CreateEnum
CREATE TYPE "AgressorArma" AS ENUM ('SIM', 'NAO', 'NAO_SEI');

-- CreateEnum
CREATE TYPE "EmergencyContactType" AS ENUM ('FAMILIAR', 'ONG', 'POLICIA');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('NOVO', 'EM_ATENDIMENTO', 'ENCAMINHADO', 'RESOLVIDO');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('ABERTA', 'EM_ATENDIMENTO', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "ChatSender" AS ENUM ('USUARIA', 'ESPECIALISTA', 'SISTEMA');

-- CreateEnum
CREATE TYPE "AdminPerfil" AS ENUM ('SUPER_ADMIN', 'ATENDENTE', 'MODERADOR');

-- CreateEnum
CREATE TYPE "SessionOwner" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DispatchChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('SIMULADO', 'ENVIADO', 'FALHA');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('PSICOLOGICA', 'JURIDICA', 'OUTRA');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "apelido" TEXT,
    "contato" TEXT NOT NULL,
    "contato_bidx" TEXT NOT NULL,
    "search_tokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pin_hash" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "tipo_violencia" TEXT NOT NULL,
    "tipo_violencia_bidx" TEXT NOT NULL,
    "agressor_arma" TEXT NOT NULL,
    "agressor_arma_bidx" TEXT NOT NULL,
    "consentimento_lgpd" BOOLEAN NOT NULL,
    "consentimento_data" TIMESTAMP(3),
    "login_failures" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "excluido_em" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "tipo" "EmergencyContactType" NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "excluido_em" TIMESTAMP(3),

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "AlertStatus" NOT NULL DEFAULT 'NOVO',
    "prioridade" "AlertPriority" NOT NULL DEFAULT 'BAIXA',
    "arma_presente" BOOLEAN NOT NULL DEFAULT false,
    "atendido_por" UUID,
    "encaminhado_para" TEXT,
    "notas" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_dispatches" (
    "id" UUID NOT NULL,
    "alert_id" UUID NOT NULL,
    "canal" "DispatchChannel" NOT NULL,
    "destino_mascarado" TEXT NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'SIMULADO',
    "provider_ref" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" UUID NOT NULL,
    "token_anonimo" TEXT NOT NULL,
    "status" "ChatStatus" NOT NULL DEFAULT 'ABERTA',
    "admin_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "encerrado_em" TIMESTAMP(3),

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "remetente" "ChatSender" NOT NULL,
    "conteudo_criptografado" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "AdminPerfil" NOT NULL,
    "totp_secret" TEXT,
    "totp_habilitado" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "precisa_trocar_senha" BOOLEAN NOT NULL DEFAULT true,
    "primeiro_acesso_token" TEXT,
    "primeiro_acesso_expira" TIMESTAMP(3),
    "login_failures" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "ultimo_login" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "excluido_em" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "owner_type" "SessionOwner" NOT NULL,
    "user_id" UUID,
    "admin_id" UUID,
    "refresh_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngos" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "telefone" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "site" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ngos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pages" (
    "id" UUID NOT NULL,
    "tipo" "ContentType" NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumo" TEXT,
    "conteudo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "publicado" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "admin_id" UUID,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "detalhes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_contato_bidx_key" ON "users"("contato_bidx");

-- CreateIndex
CREATE INDEX "users_search_tokens_idx" ON "users" USING GIN ("search_tokens");

-- CreateIndex
CREATE INDEX "users_tipo_violencia_bidx_idx" ON "users"("tipo_violencia_bidx");

-- CreateIndex
CREATE INDEX "users_agressor_arma_bidx_idx" ON "users"("agressor_arma_bidx");

-- CreateIndex
CREATE INDEX "users_criado_em_idx" ON "users"("criado_em");

-- CreateIndex
CREATE INDEX "emergency_contacts_user_id_idx" ON "emergency_contacts"("user_id");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_prioridade_idx" ON "alerts"("prioridade");

-- CreateIndex
CREATE INDEX "alerts_criado_em_idx" ON "alerts"("criado_em");

-- CreateIndex
CREATE INDEX "alert_dispatches_alert_id_idx" ON "alert_dispatches"("alert_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_token_anonimo_key" ON "chat_sessions"("token_anonimo");

-- CreateIndex
CREATE INDEX "chat_sessions_status_idx" ON "chat_sessions"("status");

-- CreateIndex
CREATE INDEX "chat_sessions_criado_em_idx" ON "chat_sessions"("criado_em");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_criado_em_idx" ON "chat_messages"("session_id", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_perfil_idx" ON "admins"("perfil");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_hash_key" ON "sessions"("refresh_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_admin_id_idx" ON "sessions"("admin_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "ngos_uf_idx" ON "ngos"("uf");

-- CreateIndex
CREATE INDEX "content_pages_tipo_publicado_idx" ON "content_pages"("tipo", "publicado");

-- CreateIndex
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "audit_logs_entidade_idx" ON "audit_logs"("entidade");

-- CreateIndex
CREATE INDEX "audit_logs_criado_em_idx" ON "audit_logs"("criado_em");

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_atendido_por_fkey" FOREIGN KEY ("atendido_por") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_dispatches" ADD CONSTRAINT "alert_dispatches_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
