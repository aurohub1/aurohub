# CLAUDE.md — Aurohub (Next.js)

## Identidade
Produto SaaS para agências de viagem. Empresa: Aurovista (Mirassol, SP).
Fundador/dev solo: Duane.

## Stack
- Next.js 15 + TypeScript + Tailwind v4 + App Router
- Konva + react-konva (editor de imagens)
- Supabase: https://emcafedppvwparimvtob.supabase.co
- Vercel (deploy)
- Cloudinary: cloud dxgj4bcch

## Hierarquia de usuários
ADM raiz → Marca/Licenciado → Loja → Funcionário
ADM vê e controla tudo. ADM libera planos, formulários e ferramentas por cliente.

## Planos
Essencial / Profissional / Franquia / Enterprise

## Formulários do editor
Pacote, Campanha, Cruzeiro, Passagem, Anoiteceu, Lâmina
ADM define quais formulários cada cliente pode usar.

## Referência de código
Pasta AUROHUB FIRE = fonte de verdade do Estável (v1).
Nunca copiar código JS puro — tudo em React/TypeScript.
editor.js (171KB) = motor do editor, base para migração Konva/React.

## Regras absolutas
- Nunca usar <datalist> nativo — sempre Combobox customizado
- Nunca modificar arquivos do Estável (AUROHUB FIRE)
- Cada sessão tem escopo fechado — um módulo por vez
- Ler arquivos antes de editar
- Sem código de demonstração — tudo funcional
- Instagram API: sempre graph.instagram.com
- AZV tokens são permanentes — nunca sugerir renovação

## Layout da página /cliente/publicar (PublicarPageBase.tsx)
**Container raiz:** `height: calc(100dvh - 40px)` para reservar espaço do ticker fixo

**Coluna esquerda:** `display:flex, flexDirection:column, height:100%`
  - **Scroll container:** `flex:1, minHeight:0, overflowY:auto` — só formulários
  - **PublishFooter:** `flexShrink:0` — fixo no fundo, FORA do scroll

**NUNCA colocar o PublishFooter dentro do scroll container**  
**NUNCA adicionar espaçadores para compensar o footer**

## Design
- Dark premium por padrão, suporte a light
- DM Sans (UI) + DM Serif Display (títulos)
- Brand: azul #1E3A6E/#3B82F6, ouro #D4A843, laranja #FF7A1A
- Glassmorphism sutil nos cards e modais
- Mobile-first, responsivo

## Regras de tema claro/escuro
- Tema escuro: fundo #060B16, textos claros, logo branca
- Tema claro: fundo #EEF2FA, textos azul escuro #0D1628, logo laranja
- No login tema claro: "Crie." e números (4+) ficam #1E3A6E (azul escuro)
- Logo: dark = branca (Logo_com_fundo_trans22_1_wujniv.png), light = laranja (logo_aurovista.png em /public)
- Nunca usar cores hardcoded onde o tema deve variar — sempre condicional via theme state ou var(--variavel)

## Módulos (ordem de prioridade)
1. Dashboard
2. Licenciados (multi-cliente)
3. Planos
4. Templates
5. Editor de artes (Konva)
6. Usuários
7. Logs
8. Configurações
