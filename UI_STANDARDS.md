# UI_STANDARDS.md — Aurohub v2
> Leia este arquivo ANTES de qualquer alteração visual. É a constituição do design system.

---

## ⚠️ Regra #1 — Não quebrar o que funciona
- Melhorias visuais são feitas via `className` / CSS apenas
- Nunca alterar estrutura de componentes existentes sem instrução explícita
- Nunca reescrever arquivos inteiros — mudanças cirúrgicas
- Nunca criar novos arquivos de estilo globais
- Nunca usar CSS inline onde Tailwind resolve
- Nunca usar `<datalist>` nativo — sempre Combobox customizado com ↑↓ Enter Escape

---

## Cores (imutáveis)

| Token | Valor | Uso |
|-------|-------|-----|
| Primary Dark | `#1E3A6E` | Fundo sidebar, headers ADM |
| Primary | `#3B82F6` | Botões, links, destaques |
| Gold | `#D4A843` | Badges premium, ícones especiais |
| Orange | `#FF7A1A` | CTAs secundários, alertas |
| Text principal | `#1E293B` | Corpo de texto (light) |
| Text secundário | `#64748B` | Labels, captions |
| Surface | `#F8FAFC` | Background geral (light) |
| Border | `#E2E8F0` | Bordas de cards (light) |

---

## Tipografia

| Contexto | Classe Tailwind |
|----------|----------------|
| Título de página | `text-2xl font-bold text-slate-800` |
| Subtítulo de seção | `text-sm font-semibold text-slate-500 uppercase tracking-wide` |
| Label de campo | `text-xs text-slate-500` |
| Corpo | `text-sm text-slate-600` |
| Valor grande (KPI) | `text-3xl font-bold` |
| Caption | `text-xs text-slate-400` |

Fontes: **DM Sans** (UI geral) + **DM Serif Display** (títulos hero)

---

## Layout Base

- **Sidebar:** `w-40` (160px) fixo, `bg-white border-r border-slate-200` — nunca alterar
- **Content area:** `p-6`, `bg-slate-50` — nunca alterar
- **Max width do conteúdo:** sem limite (full)
- **Grid padrão:** `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`

---

## Componentes — Padrão

### Cards
```
rounded-xl shadow-sm bg-white border border-slate-100 p-6
```
Hover: `hover:shadow-md transition-shadow duration-200`

### Botão primário
```
bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors
```

### Botão secundário
```
bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors
```

### Badge
```
text-xs font-medium px-2 py-0.5 rounded-full
```
Variantes: `bg-blue-100 text-blue-700` / `bg-green-100 text-green-700` / `bg-amber-100 text-amber-700`

### Empty State (obrigatório em toda lista vazia)
```jsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <IconName className="w-8 h-8 text-slate-300 mb-3" />
  <p className="text-sm text-slate-400">Nenhum X ainda.</p>
</div>
```
Ícones: Lucide React. Nunca adicionar botão de ação no empty state.

### Skeleton Loader (obrigatório durante carregamento)
```jsx
<div className="animate-pulse bg-slate-200 rounded-lg h-20 w-full" />
```

---

## Tema — Automático por Horário + Toggle Manual

### Lógica de inicialização (ThemeProvider)
```
06:00–18:59 → tema claro (light)
19:00–05:59 → tema escuro (dark)
```
Se o usuário alterou manualmente → respeitar `localStorage["ah_theme"]` acima de tudo.
Nunca resetar a preferência manual ao navegar entre páginas.

### Variáveis CSS obrigatórias
```css
/* light */
--bg: #F8FAFC;
--surface: #FFFFFF;
--border: #E2E8F0;
--text: #1E293B;
--text-muted: #64748B;

/* dark */
--bg: #0F172A;
--surface: #1E293B;
--border: #334155;
--text: #F1F5F9;
--text-muted: #94A3B8;
```

---

## Níveis de Usuário — Regras por Tela

### ADM Aurovista
- Acesso total a todas as seções
- Vê dados globais de todas as marcas/unidades
- Pode editar planos, licensees, templates, hierarquias
- Badge: `bg-purple-100 text-purple-700`

### Cliente/Marca
- Vê dados apenas da sua marca e suas unidades
- Não acessa dados de outras marcas
- Badge: `bg-blue-100 text-blue-700`

### Gerente/Unidade
- Vê dados apenas da sua unidade
- Acessa painel de publicação e histórico da unidade
- Badge: `bg-green-100 text-green-700`

### Consultor
- Acessa apenas o formulário de publicação
- Vê somente seu próprio histórico de posts
- Não vê dados de outros consultores
- Badge: `bg-orange-100 text-orange-700`

> **NUNCA** exibir dados de outra unidade/marca por nível errado de usuário.

---

## O que NUNCA fazer

- ❌ Adicionar animações pesadas (sem Framer Motion desnecessário)
- ❌ Trocar Tailwind por CSS inline
- ❌ Criar novos arquivos globais de estilo
- ❌ Alterar `globals.css` sem instrução explícita
- ❌ Usar a palavra "Vendedor" — o correto é **Consultor**
- ❌ Usar `graph.facebook.com` para Instagram API — sempre `graph.instagram.com`
- ❌ Mostrar preço sem separar inteiro/centavos (regra de display de preço)
- ❌ Usar `<datalist>` nativo
- ❌ Implementar features sem aprovação prévia

---

## Após qualquer alteração
```bash
git add .
git commit -m "ui: descrição da mudança"
git push
```
