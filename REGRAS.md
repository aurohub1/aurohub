# REGRAS OBRIGATÓRIAS — Aurohub v2

## Hierarquia de Usuários
- **ADM raiz** → vê tudo, gerencia tudo
- **Marca/Licenciado** → ADM com `marca_id`, vê apenas sua marca
- **Loja** → vê apenas sua loja e funcionários
- **Funcionário (cliente)** → usa editor, publica, sem acesso admin

## Regras AZV (cliente âncora)
- Rio Preto pode postar para: Rio Preto, Damha, Barretos
- Barretos só posta para: Barretos
- Damha só posta para: Damha
- IDs Instagram (NUNCA alterar):
  - Rio Preto: `24935761849433430`
  - Barretos: `26142577712029524`
  - Damha: `26585470474377899`
- Sempre usar `graph.instagram.com` (nunca `graph.facebook.com`)

## Publicação — Contagem Unificada
- **Feed = 1 ponto** | **Reels = 2 pontos** → quota compartilhada "Feed e Reels"
- **Stories** → quota independente
- **Transmissão (TV)** → apenas download, sem postagem Instagram
  - Suporta até 6 preços na mesma imagem
  - Formato: 1920×1080

## Formatos
- Stories: 1080×1920
- Feed: 1080×1350
- Reels: cópia direta do Stories
- Transmissão: 1920×1080

## Planos Comerciais
| Plano | Preço/mês |
|---|---|
| Essencial | R$297 |
| Profissional | R$597 |
| Franquia/Rede | R$997 |
| Enterprise | Sob consulta |

## Packs de Créditos
| Pack | Preço | Validade |
|---|---|---|
| Pack 10 | R$19 | 90 dias |
| Pack 30 | R$49 | 90 dias |
| Pack 60 | R$89 | 90 dias |
- Sem reset mensal — créditos vencem em 90 dias

## Vitrine (add-on Franquia/Enterprise)
- Individual: R$29/mês
- Time (até 10 sedes): R$199/mês
- Rede (até 30 sedes): R$449/mês

## Arquitetura de Código
- Fonte principal: Helvetica Neue (7 pesos)
- Design: dark blue (#0E1520) + gold (#D4A843) + orange (#FF7A1A)
- Editor usa Konva.js (canvas nativo, não Fabric.js)
- Cada template: arquivo independente, 4 forms × 4 formatos
- `editor/` nunca carrega CSS/JS do admin
- Tokens Instagram são permanentes — não expiram, não alterar

## Controle ADM
- ADM pode liberar/bloquear acesso por template e por usuário
- Filtro obrigatório em tudo: marca, loja, usuário
- Templates, formulários, renders, API keys filtrados por hierarquia

## Formulário Público
- Tamanho da fonte por campo individual (para nomes grandes)
- Campo parcela: número inteiro grande + centavos em 1/3 do tamanho

## Regras de Desenvolvimento
- Ler arquivo antes de modificar
- Tocar APENAS no que foi pedido
- Nunca inventar ou implementar features sem aprovação
- Verificar impacto funcional em arquivos compartilhados
- Entregar proativamente todos os arquivos afetados
- Syntax-check antes de entregar
- Confirmar exatamente o que mudou
