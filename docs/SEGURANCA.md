# Seguranca - Alerta Segura

## Transporte e cabecalhos

- HTTPS com HSTS em producao
- Cookies HttpOnly, Secure (producao) e SameSite=Strict
- Helmet, CSP, Referrer-Policy no-referrer
- CORS restrito a `APP_URL`
- `Cache-Control: no-store` em rotas `/api`

## Segredos e criptografia

- PIN/senha: Argon2id
- Campos sensiveis: AES-256-GCM (`CRYPTO_KEY`, 32 bytes em base64)
- Busca sobre dados cifrados: blind index HMAC-SHA256 (`BLIND_INDEX_KEY`)
- Segredo TOTP armazenado cifrado
- Mensagens de chat cifradas

Nunca registre nome, telefone, endereco, PIN ou conteudo de mensagem em logs.

## Sessoes

- Access token curto (5 min usuaria, 15 min admin)
- Refresh token rotativo
- Expiracao por inatividade
- Saida rapida invalida a sessao no servidor e limpa storage no cliente

## Controles

- RBAC no backend (Super Admin, Atendente, Moderador)
- CSRF double-submit
- Rate limit e bloqueio apos falhas de login
- CAPTCHA aritmetico discreto no cadastro
- Validacao Zod
- Chat anonimo: token aleatorio, sem IP, apagado ao encerrar ou apos o prazo informado

## Transparencia (LGPD)

Textos do app deixam claro que, em um alerta, a equipe autorizada e os contatos cadastrados podem ver dados necessarios ao socorro. Consentimento explicito, direito de acesso, correcao e exclusao.

## Backup

`backend/src/scripts/backup.sh` exporta o banco e cifra com GPG.
