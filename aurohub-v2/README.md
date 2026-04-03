# Aurohub v2

Plataforma SaaS para criação e publicação de conteúdo profissional para Instagram.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend + Backend | Next.js 15 + TypeScript |
| Estilo | Tailwind CSS v4 |
| Editor Canvas | Konva.js + react-konva |
| Banco | Supabase (wwwpuqjdpecnixvbqigq) |
| Storage | Cloudinary (dxgj4bcch) |
| Deploy | Vercel |

## Hierarquia de Usuários

```
ADM Raiz
  └── Marca / Licenciado (ADM com marca_id)
        └── Loja
              └── Funcionário (cliente)
```

Cada nível só vê e gerencia o que está abaixo dele.

## Estrutura

```
app/
  (auth)/login/       → tela de login
  (dashboard)/        → layout com sidebar
    dashboard/        → painel principal
    publish/          → publicar post
    schedule/         → agendamentos
    metrics/          → métricas
    editor/           → editor canvas Konva
  admin/              → páginas ADM
    usuarios/
    planos/
    templates/
    logs/
  api/
    auth/login/       → autenticação
    auth/logout/      → logout
    instagram/publish/ → publicação Instagram
    cloudinary/       → upload de imagens
    cron/             → jobs agendados
components/
  ui/                 → botões, inputs, modais
  editor/             → componentes Konva
  layout/             → sidebar, topbar
lib/
  supabase.ts         → clients Supabase
  auth.ts             → session helpers
  instagram.ts        → Graph API
  format.ts           → formatação BR
types/
  index.ts            → tipos TypeScript
database/
  schema.sql          → schema completo
```

## Setup

1. Clone o repo
2. `npm install`
3. Copie `.env.example` → `.env.local` e preencha
4. Rode `database/schema.sql` no Supabase SQL Editor
5. `npm run dev`

## Deploy

Push para `main` → Vercel faz deploy automático.

## Regras

Ver [REGRAS.md](./REGRAS.md) para todas as regras obrigatórias.
