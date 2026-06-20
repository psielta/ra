# AGENT.md — Instruções para agentes de IA

Guia operacional para qualquer agente de IA (Claude, GPT, Cursor, Copilot, etc.) que modifica, depura ou estende o repositório **Ra**.

## Missão do projeto

Construir um portfolio de mídia (gravar e assistir músicas e vídeos) com tema egípcio (deus **Ra**) sobre base Next.js production-ready. Entregas incrementais devem preservar autenticação, layout admin e consistência visual enquanto evoluem o domínio de mídia.

## Contexto mínimo

```
Projeto:  Ra — portfolio pessoal de música (MP3/HLS) e vídeo (MP4/HLS)
Stack:    Next.js 16.2.9 + Auth.js + Prisma + PostgreSQL + Tailwind/shadcn
Worker:   .NET 10 Worker Service (FFmpeg) — padrão WorkerServiceBuscaPrecoIA
Fila:     RabbitMQ (jobs) + Redis (progresso pub/sub em tempo real)
Storage:  MinIO / S3 + Nginx (serve HLS .m3u8/.ts e covers)
Player:   hls.js (áudio e vídeo HLS)
Idioma:   UI em pt-BR
Infra:    Docker Compose
Portas:   14001–15000 APENAS (host)
```

## Pipeline de mídia (visão alvo)

```text
Upload (Next.js API) → Storage → RabbitMQ → Worker .NET (FFmpeg) → HLS/covers → Storage
                                                      ↓ Redis pub/sub (job.progress)
PostgreSQL (status: processing|ready|error) ←─────────┘
Nginx → Frontend (hls.js + progresso realtime)
```

Referência de implementação do worker: `D:\globalleitorpdf\globalleitorpdf\WorkerServiceBuscaPrecoIA`

- RabbitMQ.Client 6.8.1, StackExchange.Redis 2.8.16, .NET 10, Serilog 4.3.1
- `PublishProgressAsync` → canal Redis `job.progress`

## Mapa de portas

```typescript
// src/config/ports.ts
PORTS.app = 14001; // Next.js
PORTS.postgres = 14002; // PostgreSQL
PORTS.prismaStudio = 14003; // Prisma Studio
PORTS.rabbitmq = 14004; // RabbitMQ AMQP
PORTS.rabbitmqManagement = 14005; // RabbitMQ UI (dev)
PORTS.redis = 14006; // Redis pub/sub + cache
PORTS.minio = 14007; // Object storage (S3 API)
PORTS.minioConsole = 14008; // MinIO UI (dev)
PORTS.nginx = 14009; // Serve HLS (.m3u8/.ts) e MP3
PORTS.workerMetrics = 14010; // Prometheus do worker (opcional)
```

Ao criar novo serviço, escolha a próxima porta livre em **14001–15000** e registre em `src/config/ports.ts` + `.env.example`.

Documentação de produto e arquitetura completa: [`README.md`](./README.md).

## Fluxos de trabalho

### Modo dev — **padrão para agentes** (hot reload + testes)

Use este fluxo ao **implementar UI**, **iterar frontend** ou **testar com Playwright / Playwright MCP**. O hot reload evita rebuild de container a cada mudança.

```bash
cp .env.example .env

# 1. Só Postgres no Docker (porta 14002)
npm run docker:db

# 2. Se a app Docker estiver rodando, pare para liberar a 14001
docker compose stop app

# 3. App local com Turbopack + hot reload
npm run dev
# → http://localhost:14001
```

Migrations: rode `npm run db:migrate` localmente quando alterar `prisma/schema.prisma`, ou `npm run docker:migrate` se preferir via container one-off.

**Por que não Docker para a app em dev?**

- Sem hot reload rápido (volume mount é mais lento que `npm run dev` nativo)
- Playwright MCP e inspeção manual ficam mais ágeis com reload instantâneo
- Logs e erros aparecem direto no terminal local

### Modo Docker completo — validação de infra

Use quando precisar validar **entrypoint**, **Compose**, **imagem** ou ambiente próximo de deploy — não para iterar UI.

```bash
npm run docker:up          # ou npm run docker:dev (foreground)
# App: http://localhost:14001 (sem hot reload eficiente)
```

Migrations rodam automaticamente no entrypoint do container.

Antes de voltar ao modo dev local, pare a app Docker: `docker compose stop app`.

### Testar com Playwright

```bash
# Pré-requisito: app em npm run dev na 14001 (modo dev acima)
npm run test:e2e

# Ou usar Playwright MCP apontando para http://localhost:14001
```

Playwright `baseURL` já está em `http://localhost:14001` (`playwright.config.ts`). Não subir app Docker e `npm run dev` ao mesmo tempo — conflitam na porta 14001.

### Verificar mudanças

```bash
npm run typecheck
npm run lint
npm run test
npm run build              # mudanças estruturais/significativas
```

### Commits — Conventional Commits (obrigatório)

**Todo commit** neste repositório deve seguir o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```text
<tipo>[escopo opcional]: <descrição curta>

[corpo opcional]

[rodapé opcional]
```

Regras:

- **tipo** em inglês, minúsculo: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **escopo** opcional, em inglês e minúsculo — módulo afetado (`auth`, `media`, `docker`, `ui`, `prisma`, etc.)
- **descrição** imperativa, minúscula, sem ponto final; pt-BR ou inglês, mas consistente no mesmo commit
- **breaking change**: `!` após o escopo/tipo (`feat(api)!: ...`) ou rodapé `BREAKING CHANGE: ...`
- **um assunto por commit** — não misturar correção de favicon com refactor de auth na mesma mensagem

Exemplos válidos:

```text
feat(media): add upload API with MinIO storage
fix(auth): redirect to dashboard after sign-in
docs: document conventional commit standard in AGENT.md
chore(docker): expose RabbitMQ on port 14004
refactor(ui): align favicon with RaLogo sun disk
```

Exemplos inválidos:

```text
fix stuff
WIP
atualiza logo e corrige bug
feat: Added new feature.
```

Agentes que criam commits devem usar essa convenção. O Husky roda `lint-staged` no `pre-commit`; mensagens fora do padrão prejudicam histórico e changelog futuro.

### Windows

Caminho do repo: `D:\ra`. PowerShell interpreta `\r` como carriage return.

```bat
cmd /c "cd /d D:\ra && npm run docker:db"
cmd /c "cd /d D:\ra && docker compose stop app"
cmd /c "cd /d D:\ra && set PORT=14001 && npm run dev"
```

## Árvore de decisão para tarefas

```
Nova funcionalidade?
├── Envolve upload/gravação de MP3 ou MP4?
│   ├── Sim → API upload + Storage + TranscodeJob (processing)
│   │         → publicar RabbitMQ → NÃO transcodificar no Next.js
│   └── Não → seguir fluxo abaixo
├── Precisa de conversão ou processamento pesado?
│   ├── Sim → worker/ (.NET 10 + FFmpeg) + Redis progress
│   └── Não → API route Node apenas
├── Precisa de playback?
│   ├── Vídeo → HLS via Nginx + hls.js (só após status ready)
│   └── Áudio → HLS via Nginx + hls.js anexado ao <audio>
├── Precisa de progresso em tempo real?
│   └── Sim → worker publica Redis → API expõe SSE → TanStack Query invalida
├── Precisa de dados persistentes?
│   ├── Sim → schema.prisma + migration + API route + UI
│   └── Não → componente/page apenas
├── Precisa de auth?
│   ├── Sim → rota em (admin)/dashboard/ + guard middleware
│   └── Não → rota pública ou API sem sessão
├── Precisa de formulário?
│   └── Sim → zod schema + react-hook-form + sonner toast
└── Precisa de tabela?
    └── Sim → TanStack Table via DataTable base
```

## Domínio de mídia (contratos previstos)

### Ciclo de vida do job

| Status       | Quem define                   | Significado                                      |
| ------------ | ----------------------------- | ------------------------------------------------ |
| `processing` | API Next.js ao receber upload | Original no storage; job na fila ou em conversão |
| `ready`      | Worker ao concluir FFmpeg     | HLS (vídeo) ou MP3 disponível para playback      |
| `error`      | Worker ou API em falha        | Conversão, storage ou fila falhou                |

PostgreSQL é a **fonte de verdade** do status. Redis transporta eventos efêmeros de progresso.

### Storage (paths)

```text
uploads/{userId}/{jobId}/source.mp4|source.mp3    # original
outputs/{userId}/{jobId}/index.m3u8 + *.ts        # vídeo HLS
outputs/{userId}/{jobId}/index.m3u8 + *.ts        # áudio HLS
outputs/{userId}/{jobId}/cover.jpg                # cover automático de vídeo
```

### RabbitMQ

```text
Exchange: media-transcode-exchange (previsto)
Queue:    media-transcode-jobs
Payload:  { jobId, userId, mediaType: "audio"|"video", storageKey, mimeType }
```

### Redis Pub/Sub

Canais (padrão `WorkerServiceBuscaPrecoIA`):

| Canal           | Quando                                           |
| --------------- | ------------------------------------------------ |
| `job.progress`  | A cada etapa FFmpeg (percentual, stage, message) |
| `job.completed` | HLS pronto; inclui URLs de playback e cover      |
| `job.failed`    | Erro com código e mensagem                       |

A API Next.js faz **bridge** Redis → SSE (`/api/media/jobs/[id]/events`) para o browser. O frontend **não** consulta o worker diretamente.

### Regras de mídia

- Vídeo: MP4 é **entrada**; playback no browser é sempre **HLS** (`.m3u8`).
- Áudio: MP3/WebM é **entrada**; playback no browser é sempre **HLS** (`.m3u8`).
- **Nunca** rodar FFmpeg no processo Next.js — CPU-bound no worker .NET.
- **Nunca** usar polling agressivo no PostgreSQL para progresso — usar Redis/SSE.
- Nginx serve segmentos HLS com MIME types corretos; CORS alinhado ao player.

## Contratos e padrões

### Autenticação

| Arquivo                              | Responsabilidade                   | Runtime |
| ------------------------------------ | ---------------------------------- | ------- |
| `src/auth.config.ts`                 | Rotas, `authorized` callback       | Edge    |
| `src/auth.ts`                        | Credentials, Prisma, JWT callbacks | Node    |
| `src/proxy.ts`                       | Matcher de rotas (Next.js 16)      | Node    |
| `src/app/api/auth/register/route.ts` | Registro de usuário                | Node    |

**Regra:** middleware importa apenas `auth.config.ts`. Nunca Prisma/bcrypt no edge.

Sessão do usuário:

```typescript
session.user.id; // string (cuid)
session.user.role; // "USER" | "ADMIN"
session.user.email;
session.user.name;
```

### API Routes

Template mínimo:

```typescript
import { NextResponse } from "next/server";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
// + schema Zod

export async function POST(request: Request) {
  const log = createRequestLogger({ module: "nome", requestId: crypto.randomUUID() });
  try {
    // validar → executar → log.info({ event: "modulo.ok" })
    return NextResponse.json({ ... }, { status: 200 });
  } catch (error) {
    log.error({ event: "modulo.error", error: ... });
    return NextResponse.json({ message: "..." }, { status: 500 });
  }
}
```

### Formulários client

- Schema Zod em `src/lib/validations/`
- `zodResolver` + `react-hook-form`
- Feedback: `sonner` toast (sucesso/erro em pt-BR)
- POST via `api` de `src/lib/axios` ou `signIn` do next-auth

### Estado

| Tipo         | Ferramenta             | Quando usar                                |
| ------------ | ---------------------- | ------------------------------------------ |
| Server state | TanStack Query         | Dados de API, cache, mutations             |
| UI local     | Zustand                | Preferências de UI (ex: sidebar collapsed) |
| Sessão       | next-auth `useSession` | Dados do usuário logado                    |

### UI / Design system

- **shadcn/ui** em `src/components/ui/` — estilo `new-york`
- **Tema egípcio** — ver `src/app/globals.css`
- Classes utilitárias: `font-display`, `text-gold`, `bg-lapis`, `egyptian-pattern`
- Ícones: `lucide-react` only
- Layout admin: `AdminShell` → `AdminSidebar` + `AdminHeader`

Adicionar shadcn:

```bash
npx shadcn@latest add <component>
```

## Rotas existentes

| Rota                      | Grupo   | Auth                            |
| ------------------------- | ------- | ------------------------------- |
| `/`                       | root    | redirect → dashboard ou sign-in |
| `/sign-in`                | (auth)  | público                         |
| `/sign-up`                | (auth)  | público                         |
| `/dashboard`              | (admin) | requer sessão                   |
| `/dashboard/users`        | (admin) | placeholder                     |
| `/dashboard/papyri`       | (admin) | Lexical demo                    |
| `/dashboard/settings`     | (admin) | placeholder                     |
| `/api/auth/[...nextauth]` | API     | Auth.js                         |
| `/api/auth/register`      | API     | POST signup                     |

## Banco de dados

Provider: PostgreSQL via Prisma.

Modelos principais: `User` (com `Role` enum), `Account`, `Session`, `VerificationToken`.

```bash
# Criar migration
npm run db:migrate

# Aplicar em produção/container
npm run docker:migrate
```

Senhas: `bcryptjs` com cost 12 no registro. Nunca retornar `passwordHash` em responses.

## Docker

```yaml
# docker-compose.yml
postgres: 14002:5432
app: 14001:3000  (PORT=3000 interno)
```

Volumes nomeados: `ra_postgres_data`, `ra_node_modules`, `ra_next_cache`.

Produção: `docker-compose.yml` + `docker-compose.prod.yml`.

## Testes

| Tipo | Comando            | Local              |
| ---- | ------------------ | ------------------ |
| Unit | `npm run test`     | `src/**/*.test.ts` |
| E2E  | `npm run test:e2e` | `e2e/*.spec.ts`    |

Playwright `baseURL`: `http://localhost:14001`.

Ao alterar páginas de auth, atualizar `e2e/auth.spec.ts`.

## Variáveis de ambiente

### Atuais (v0.1)

| Variável              | Obrigatória | Descrição                                                    |
| --------------------- | ----------- | ------------------------------------------------------------ |
| `DATABASE_URL`        | Sim         | Postgres (host: `localhost:14002` / docker: `postgres:5432`) |
| `AUTH_SECRET`         | Sim         | Segredo JWT (32+ bytes)                                      |
| `AUTH_URL`            | Sim         | `http://localhost:14001`                                     |
| `NEXT_PUBLIC_APP_URL` | Sim         | URL pública da app                                           |
| `PORT`                | Não         | Default 14001 local; 3000 no container                       |
| `SENTRY_DSN`          | Não         | Observabilidade                                              |
| `LOG_LEVEL`           | Não         | `info` / `debug`                                             |

### Previstas (pipeline de mídia — adicionar ao `.env.example` quando implementar)

| Variável                  | Descrição                                           |
| ------------------------- | --------------------------------------------------- |
| `RABBITMQ_URL`            | `amqp://guest:guest@localhost:14004`                |
| `REDIS_URL`               | `redis://localhost:14006`                           |
| `S3_ENDPOINT` / `MINIO_*` | Object storage (MinIO em dev, S3 em prod)           |
| `S3_BUCKET`               | Bucket de uploads e outputs                         |
| `NGINX_MEDIA_URL`         | `http://localhost:14009` — base URL HLS/covers      |
| `WORKER_API_URL`          | URL interna para worker atualizar status (opcional) |

Referência: `.env.example`.

## Restrições para agentes

1. **Escopo focado** — altere apenas o necessário para a tarefa
2. **Portas** — nunca 3000/5432 no host; usar range 14001–15000
3. **Edge vs Node** — respeite a separação auth.config / auth.ts
4. **Sem docs extras** — não crie markdown não pedidos (README/AGENT/CLAUDE já existem)
5. **Migrations versionadas** — sempre commitar `prisma/migrations/`
6. **Tema** — preserve identidade egípcia em novas telas
7. **Execução real** — rode comandos você mesmo; não delegue ao usuário
8. **Qualidade** — typecheck + lint antes de concluir
9. **Mídia** — FFmpeg só no worker .NET; upload não bloqueia esperando transcode
10. **Progresso** — Redis pub/sub + SSE; não inventar polling de 1s no banco
11. **Vídeo** — playback via HLS; não expor MP4 bruto como stream principal
12. **Worker** — reutilizar o padrão do `WorkerServiceBuscaPrecoIA`; runtime alvo deste repo é `net10.0`
13. **Dev local primeiro** — ao implementar/testar UI, usar `npm run dev` + `docker:db`; não `docker:up` para a app
14. **Porta 14001** — nunca rodar app Docker e `npm run dev` simultaneamente
15. **Commits** — sempre Conventional Commits (`tipo(escopo): descrição`); nunca mensagens vagas (`fix`, `WIP`, `updates`)

## Tarefas comuns — receitas

### Adicionar página admin

```
1. src/app/(admin)/dashboard/<nome>/page.tsx
2. navItems em admin-sidebar.tsx
3. metadata { title: "<Nome> | Ra" }
4. Usar cards com border-gold/15
```

### Adicionar endpoint REST

```
1. src/app/api/<recurso>/route.ts
2. src/lib/validations/<recurso>.ts (Zod)
3. Logs pino com eventos nomeados
4. Teste unitário do schema se houver validação complexa
```

### Adicionar campo ao User

```
1. prisma/schema.prisma
2. npm run db:migrate
3. Atualizar register route / callbacks se exposto na sessão
4. Atualizar tipos em next-auth.d.ts se necessário
```

### Adicionar componente UI

```
1. Preferir shadcn existente
2. Se novo: npx shadcn@latest add <x>
3. Estilizar com tokens CSS do tema (não hardcode hex solto)
4. "use client" se usar hooks/eventos
```

### Implementar upload de mídia

```
1. prisma/schema.prisma → MediaAsset + TranscodeJob (status enum)
2. src/app/api/media/upload/route.ts → multipart, valida sessão + Zod
3. Salvar original no MinIO/S3 (uploads/{userId}/{jobId}/...)
4. Criar job status=processing no PostgreSQL
5. Publicar mensagem RabbitMQ
6. Retornar { jobId, status: "processing" }
7. UI: barra de progresso via SSE + TanStack Query
```

### Implementar worker .NET (worker/)

```
1. WorkerServiceRaMedia — .NET 10, mesmo padrão arquitetural do WorkerServiceBuscaPrecoIA
2. RabbitMqConsumerService consome media-transcode-jobs
3. FfmpegTranscodeService: MP4 → HLS; MP3/WebM → HLS audio-only
4. RedisService.PublishProgressAsync a cada etapa
5. Ao concluir: upload outputs → Storage; PATCH API ou Prisma direto → status=ready
6. Serilog; prometheus-net opcional na porta 14010
```

### Implementar player + biblioteca

```
1. /resources — TanStack Table/biblioteca com status (processing/ready/error)
2. Vídeo ready: hls.js apontando para URL Nginx (14009) ou storage
3. Áudio ready: hls.js anexado ao <audio> com URL HLS
4. processing: ProgressBar alimentada por SSE
5. error: toast + botão reenviar (futuro)
```

## Arquivos que agentes consultam primeiro

| Prioridade | Arquivo                | Por quê                |
| ---------- | ---------------------- | ---------------------- |
| 1          | `package.json`         | Scripts e dependências |
| 2          | `src/config/ports.ts`  | Portas do projeto      |
| 3          | `src/auth.config.ts`   | Guards de rota         |
| 4          | `prisma/schema.prisma` | Modelo de dados        |
| 5          | `src/app/globals.css`  | Design tokens          |
| 6          | `components.json`      | Aliases shadcn         |
| 7          | `docker-compose.yml`   | Infra local            |

## Estado atual

Entregue e funcional:

- [x] Sign-in / sign-up com validação Zod
- [x] Registro via API + login automático
- [x] Proxy Next.js 16 + layout protegendo rotas privadas
- [x] Admin layout (sidebar colapsável, header, mobile nav)
- [x] Tema egípcio (Cinzel, lapis, gold, papyrus)
- [x] Docker Compose dev + prod
- [x] Migrations Prisma iniciais
- [x] Sentry + Pino configurados
- [x] Vitest + Playwright base
- [x] Husky + lint-staged
- [x] TanStack Query, Table, Zustand, Lexical (demo em papyri)

Pipeline de mídia concluído:

- [x] Prisma: `MediaAsset`, `TranscodeJob`, `Series` (processing|ready|error)
- [x] Upload API → MinIO/S3 → publicar job RabbitMQ
- [x] Docker: RabbitMQ (14004), Redis (14006), MinIO (14007), Nginx (14009), Mailhog e worker
- [x] Worker .NET 10 `WorkerServiceRaMedia` (FFmpeg, Serilog, Redis progress)
- [x] SSE bridge Redis → frontend (progresso live)
- [x] Players HLS com hls.js para vídeo e áudio
- [x] Monitor visual dos segmentos HLS recebidos no player
- [x] Biblioteca de recursos, séries, fila de processamento e gravação MediaRecorder
- [x] Cover automático de vídeo gerado pelo worker
- [x] Upload em drawer global para não sair da rota atual
- [x] Edição de nome, descrição e série por recurso
- [x] Carrossel de vídeos da mesma série em `/resources/[id]`

Backlog de produto:

- [ ] Portfolio público por usuário
- [ ] CRUD de usuários (TanStack Table)
- [ ] Persistência Lexical (descrições/notas de mídia)
- [ ] Página de perfil/settings funcional
- [ ] Autorização por role (ADMIN vs USER)
- [ ] Seed de dados
- [ ] OAuth providers

## Estrutura atual

```text
worker/WorkerServiceRaMedia/    .NET 10 — RabbitMQ + Redis + FFmpeg
nginx/                          conf para HLS e covers
docker-compose.yml              RabbitMQ, Redis, MinIO, Nginx, Mailhog, worker
src/app/(admin)/resources/      biblioteca de mídia
src/app/api/media/              upload, jobs, SSE events
src/components/media/           upload drawer/form, player HLS, progress
```

## Documentação relacionada

- [`README.md`](./README.md) — visão de produto, pipeline completo, diagramas
- [`CLAUDE.md`](./CLAUDE.md) — guia específico com convenções detalhadas para Claude
- `.env.example` — variáveis de ambiente
- `components.json` — config shadcn/ui
- `D:\globalleitorpdf\globalleitorpdf\WorkerServiceBuscaPrecoIA` — referência worker RabbitMQ+Redis
