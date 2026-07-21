# RPI Manager

Aplicativo para análise e gestão semanal da Revista da Propriedade Industrial
(RPI) — seção de Marcas — com foco em localizar publicações em que **JANE
GLAUCIA VIEIRA** aparece exclusivamente como **procuradora**.

Status atual: **Fase 1 — Fundação** (autenticação, perfis e modelo de dados).
A importação de RPI (Fase 2) aguarda a análise de um arquivo real fornecido
pelo usuário, para não inventar estrutura de XML/PDF nem regras jurídicas.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma ORM (driver adapter `@prisma/adapter-pg`)
- Auth.js (NextAuth v5) com perfis Administrador / Analista / Consulta
- Vitest para testes unitários

## Configuração local

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL` e `AUTH_SECRET`.
2. Instale as dependências: `npm install`.
3. Rode as migrações: `npx prisma migrate dev`.
4. Popule o usuário administrador inicial: `npx prisma db seed`
   (usa `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` se definidos, senão usa um
   e-mail e senha padrão de desenvolvimento impressos no console).
5. Suba o servidor: `npm run dev` e acesse `http://localhost:3000/login`.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm run test` — testes (Vitest)
- `npx prisma studio` — inspecionar o banco de dados
