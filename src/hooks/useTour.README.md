# useTour Hook

Hook para criar tours guiados nas páginas usando Driver.js.

## Instalação

O Driver.js já está instalado no projeto. Apenas importe o hook.

## Uso básico

```tsx
import { useTour } from "@/hooks/useTour";

export default function MinhaPage() {
  const { startTour, tourCompleted } = useTour({
    pageKey: "adm-metricas", // Identificador único da página
    steps: [
      {
        element: "#filtros",
        popover: {
          title: "Filtros",
          description: "Use estes filtros para refinar os dados exibidos."
        }
      },
      {
        element: "#grafico",
        popover: {
          title: "Gráfico",
          description: "Visualize as métricas ao longo do tempo."
        }
      }
    ],
    autoStart: true, // Opcional: default true
    delay: 1000 // Opcional: delay em ms, default 1000
  });

  return (
    <div>
      <button onClick={startTour}>Religar tour</button>
      {/* Seu conteúdo aqui */}
    </div>
  );
}
```

## Parâmetros

- **pageKey**: `string` - Identificador único da página (ex: "adm-metricas", "cliente-publicar")
- **steps**: `DriveStep[]` - Array de passos do Driver.js
- **autoStart**: `boolean` (opcional) - Se deve iniciar automaticamente. Default: `true`
- **delay**: `number` (opcional) - Delay em ms antes de iniciar automaticamente. Default: `1000`

## Retorno

- **startTour**: `() => void` - Função para iniciar o tour manualmente
- **tourCompleted**: `boolean` - Se o usuário já completou o tour desta página

## Como funciona

1. O hook verifica em `profiles.tour_pages` se o usuário já completou o tour
2. Se não completou e `autoStart=true`, inicia automaticamente após o delay
3. Quando o usuário completa ou pula o tour, salva em `profiles.tour_pages`
4. O tour só aparece uma vez por usuário, mas pode ser religado via `startTour()`

## Exemplo completo

```tsx
"use client";

import { useTour } from "@/hooks/useTour";

export default function AdmMetricasPage() {
  const { startTour, tourCompleted } = useTour({
    pageKey: "adm-metricas",
    steps: [
      {
        element: "#kpis",
        popover: {
          title: "KPIs principais",
          description: "Aqui você vê os números mais importantes do dia, semana e mês."
        }
      },
      {
        element: "#filtros",
        popover: {
          title: "Filtros",
          description: "Refine os dados por período, formato, tipo, licensee e loja."
        }
      },
      {
        element: "#grafico",
        popover: {
          title: "Gráfico de tendência",
          description: "Visualize a evolução das publicações e downloads ao longo do tempo."
        }
      },
      {
        popover: {
          title: "Pronto! 🎉",
          description: "Explore as métricas e use os filtros para analisar os dados."
        }
      }
    ]
  });

  return (
    <div>
      <div className="flex justify-between">
        <h1>Métricas</h1>
        {tourCompleted && (
          <button onClick={startTour}>Ver tour novamente</button>
        )}
      </div>
      
      {/* Seu conteúdo aqui */}
    </div>
  );
}
```

## Personalização do Driver.js

O hook usa as configurações padrão do Driver.js:
- `showProgress: true` - Mostra progresso (1/4, 2/4, etc)
- `showButtons: ["next", "previous", "close"]` - Botões de navegação

Para mais opções, edite o hook em `src/hooks/useTour.ts`.

## SQL Migration

Execute o SQL em `database/add_tour_pages.sql` no Supabase para adicionar a coluna `tour_pages` em `profiles`:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tour_pages text[] DEFAULT '{}';
```
