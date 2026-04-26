# Análise: Migração de Templates V1 → V2

## 📦 ESTRUTURA V1 (Supabase wwwpuqjdpecnixvbqigq)

### Tabela: `templates`

**Registro exemplo (Template Passagem Aérea):**

```json
{
  "id": 63,
  "form": "passagem",
  "format": "feed",
  "variant": "1",
  "grupo": "",
  "marca_id": "602d5fe8-8728-4dd8-b310-2263717cfe86",
  "updated_at": "2026-03-22T20:46:20.183+00:00",
  "json": "{...}" // String JSON do Fabric.js
}
```

### Campo `json` (Fabric.js Canvas):

```javascript
{
  "version": "5.3.0",
  "background": "#0B1D3A",
  "objects": [
    // Array de objetos Fabric.js
  ]
}
```

### Elementos com bindParam encontrados no template Passagem:

| Element ID | Type | bindParam | Descrição |
|---|---|---|---|
| acgouhwadtyqlyftchde | image | **img_fundo** | Imagem de fundo |
| destino | textbox | **destino** | Nome do destino (cor: #55d1f8) |
| saida1 | textbox | **saida** | Aeroporto de saída |
| voo | textbox | **voo** | Tipo de voo (Direto/Conexão) |
| periodo1 | textbox | **data_periodo** | Período da viagem |
| incluso | textbox | **incluso** | Itens inclusos |
| preco | textbox | **valor_preco** | Valor principal (Bebas Neue, #132449) |
| qvezes | textbox | **texto_parcelas** | Texto de parcelamento |
| pdamha | image | **nome_loja** | Logo da loja |

### Elementos decorativos (sem bindParam):

- `fundoazul`: Retângulo azul (#005299)
- `brancopreco`: Retângulo branco para preço
- `linhapreco`: Borda do preço
- `passagem`: Texto fixo "Passagem Aérea"
- `saida`: Label "Saída:"
- `periodo`: Label "Período:"
- Logo fixa da marca
- Retângulo branco decorativo

---

## 📦 ESTRUTURA V2 (Supabase emcafedppvwparimvtob)

### Tabela: `templates` (vazia atualmente)

**Estrutura proposta baseada no código TypeScript:**

```typescript
interface Template {
  id: string;              // UUID
  nome: string;            // "Passagem Aérea - Feed"
  tipo: string;            // "passagem" | "pacote" | "cruzeiro" | etc
  formato: string;         // "feed" | "story" | "reel"
  variante: string;        // "1" | "2" | etc
  loja_id: string;         // UUID da loja
  schema: {
    version: string;       // "1.0.0"
    width: number;         // 1080
    height: number;        // 1080
    background: string;    // "#0B1D3A"
    elements: Element[];   // Array de elementos simplificados
  };
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
}

interface Element {
  id: string;              // ID único do elemento
  type: string;            // "text" | "image" | "rect" | "group"
  bindParam?: string;      // Nome do parâmetro para bind (opcional)
  x: number;               // Posição X
  y: number;               // Posição Y
  width?: number;          // Largura (opcional)
  height?: number;         // Altura (opcional)
  
  // Propriedades de texto
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  textAlign?: string;
  
  // Propriedades de imagem
  src?: string;
  
  // Propriedades de forma
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;             // Border radius X
  ry?: number;             // Border radius Y
  
  // Propriedades visuais
  opacity?: number;
  rotation?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}
```

---

## 🗺️ MAPEAMENTO DE CONVERSÃO V1 → V2

### Campos da tabela:

| V1 | V2 | Conversão |
|---|---|---|
| `id` (number) | `id` (UUID) | Gerar novo UUID |
| `form` | `tipo` | Direto |
| `format` | `formato` | Direto |
| `variant` | `variante` | Direto |
| `marca_id` | `loja_id` | Direto |
| `grupo` | - | Remover (não usado) |
| - | `nome` | Gerar: "{tipo} - {formato} - v{variante}" |
| `json` (string) | `schema` (object) | **Converter Fabric.js → Esquema simplificado** |
| `updated_at` | `created_at` + `updated_at` | Usar mesmo timestamp |

### Conversão do campo `json` (Fabric.js) → `schema`:

```javascript
// V1: JSON string do Fabric.js
const v1Json = JSON.parse(template.json);

// V2: Estrutura simplificada
const v2Schema = {
  version: "1.0.0",
  width: 1080,  // Extrair de dimensões do canvas
  height: 1080,
  background: v1Json.background || "#0B1D3A",
  elements: v1Json.objects
    .map(obj => convertFabricObjectToElement(obj))
    .filter(Boolean)
};
```

### Função de conversão de elementos:

```typescript
function convertFabricObjectToElement(fabricObj: any): Element | null {
  const base = {
    id: fabricObj.name || generateId(),
    type: mapFabricType(fabricObj.type),
    x: fabricObj.left,
    y: fabricObj.top,
  };
  
  if (fabricObj.bindParam) {
    base.bindParam = fabricObj.bindParam;
  }
  
  switch (fabricObj.type) {
    case 'textbox':
      return {
        ...base,
        type: 'text',
        text: fabricObj.text,
        fontSize: fabricObj.fontSize,
        fontFamily: fabricObj.fontFamily,
        fontWeight: fabricObj.fontWeight,
        color: fabricObj.fill,
        textAlign: fabricObj.textAlign,
        width: fabricObj.width,
        opacity: fabricObj.opacity
      };
      
    case 'image':
      return {
        ...base,
        type: 'image',
        src: fabricObj.src,
        width: fabricObj.width * fabricObj.scaleX,
        height: fabricObj.height * fabricObj.scaleY,
        opacity: fabricObj.opacity
      };
      
    case 'rect':
      return {
        ...base,
        type: 'rect',
        width: fabricObj.width,
        height: fabricObj.height,
        fill: fabricObj.fill,
        stroke: fabricObj.stroke,
        strokeWidth: fabricObj.strokeWidth,
        rx: fabricObj.rx,
        ry: fabricObj.ry,
        opacity: fabricObj.opacity,
        shadow: fabricObj.shadow
      };
      
    default:
      return null;
  }
}

function mapFabricType(fabricType: string): string {
  const map: Record<string, string> = {
    'textbox': 'text',
    'image': 'image',
    'rect': 'rect',
    'circle': 'circle',
    'line': 'line'
  };
  return map[fabricType] || fabricType;
}
```

---

## 📊 EXEMPLO DE CONVERSÃO: Template Passagem Aérea

### V1 Input (simplificado):

```json
{
  "id": 63,
  "form": "passagem",
  "format": "feed",
  "variant": "1",
  "marca_id": "602d5fe8-8728-4dd8-b310-2263717cfe86",
  "json": "{\"version\":\"5.3.0\",\"background\":\"#0B1D3A\",\"objects\":[...]}"
}
```

### V2 Output (esperado):

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "nome": "Passagem Aérea - Feed - v1",
  "tipo": "passagem",
  "formato": "feed",
  "variante": "1",
  "loja_id": "602d5fe8-8728-4dd8-b310-2263717cfe86",
  "schema": {
    "version": "1.0.0",
    "width": 1080,
    "height": 1080,
    "background": "#0B1D3A",
    "elements": [
      {
        "id": "img_fundo",
        "type": "image",
        "bindParam": "img_fundo",
        "x": -660,
        "y": 0,
        "width": 2400,
        "height": 1350,
        "src": "https://res.cloudinary.com/dxgj4bcch/image/upload/upload/acgouhwadtyqlyftchde.jpg"
      },
      {
        "id": "destino",
        "type": "text",
        "bindParam": "destino",
        "x": 422,
        "y": 586,
        "width": 149,
        "fontSize": 15,
        "fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif",
        "fontWeight": 800,
        "color": "#55d1f8",
        "text": "Texto"
      },
      {
        "id": "saida1",
        "type": "text",
        "bindParam": "saida",
        "x": 457,
        "y": 649,
        "fontSize": 12,
        "color": "#ffffff",
        "text": "Saída:"
      },
      {
        "id": "voo",
        "type": "text",
        "bindParam": "voo",
        "x": 515,
        "y": 649,
        "fontSize": 12,
        "color": "#ffffff",
        "text": "Saída:"
      },
      {
        "id": "periodo1",
        "type": "text",
        "bindParam": "data_periodo",
        "x": 467,
        "y": 663,
        "fontSize": 12,
        "color": "#ffffff",
        "text": "Período:"
      },
      {
        "id": "preco",
        "type": "text",
        "bindParam": "valor_preco",
        "x": 451,
        "y": 716,
        "width": 139,
        "fontSize": 54,
        "fontFamily": "'Bebas Neue',cursive",
        "fontWeight": 700,
        "color": "#132449",
        "textAlign": "center",
        "text": "841,49"
      },
      {
        "id": "qvezes",
        "type": "text",
        "bindParam": "texto_parcelas",
        "x": 423,
        "y": 764,
        "fontSize": 9,
        "color": "#55d1f8",
        "textAlign": "center",
        "text": "Texto"
      }
    ]
  },
  "created_at": "2026-03-22T20:46:20.183Z",
  "updated_at": "2026-03-22T20:46:20.183Z"
}
```

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### 1. Perda de Informação

Algumas propriedades do Fabric.js não têm equivalente direto:

- `lockMovementX/Y`, `lockScalingX/Y`, `lockRotation` (controles do editor)
- `selectable`, `evented` (interatividade do editor)
- `_trackTarget`, `_isFrame`, `_corners`, `_gradAngle` (metadados internos)
- `strokeDashArray`, `strokeLineCap`, `strokeMiterLimit` (propriedades avançadas)

**Solução**: Armazenar essas propriedades em um campo `metadata` opcional se forem necessárias no futuro.

### 2. Coordenadas e Escala

- Fabric.js usa `left/top` + `scaleX/scaleY`
- V2 deve usar `x/y` + `width/height` finais (já escalados)

**Conversão**:
```javascript
const finalWidth = fabricObj.width * fabricObj.scaleX;
const finalHeight = fabricObj.height * fabricObj.scaleY;
```

### 3. Fontes e Fallbacks

Fabric.js permite múltiplas fontes:
```
"fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif"
```

V2 deve preservar a string completa ou extrair apenas a primeira?

**Recomendação**: Preservar string completa para compatibilidade CSS.

### 4. bindParams Especiais

Alguns bindParams do V1 precisam ser renomeados para V2:

| V1 | V2 | Motivo |
|---|---|---|
| `data_periodo` | `periodo` | Consistência com forms |
| `valor_preco` | `valorparcela` ou `valortotal` | Depende do contexto |
| `texto_parcelas` | (derivado) | Calculado no form |

---

## 🚀 PRÓXIMOS PASSOS

### 1. Aprovar Mapeamento
- [ ] Revisar conversão de campos
- [ ] Validar estrutura de `schema`
- [ ] Confirmar bindParams

### 2. Implementar Script de Migração
```typescript
async function migrateTemplate(v1Template: V1Template): Promise<V2Template> {
  // Implementar lógica de conversão
}

async function migrateAllTemplates() {
  const v1Templates = await fetchV1Templates();
  for (const v1 of v1Templates) {
    const v2 = await migrateTemplate(v1);
    await insertV2Template(v2);
  }
}
```

### 3. Validar Migração
- [ ] Migrar 1 template de teste
- [ ] Renderizar no editor V2
- [ ] Comparar output visual V1 vs V2
- [ ] Ajustar mapeamento se necessário

### 4. Migração Completa
- [ ] Migrar todos os templates
- [ ] Atualizar referências (lojas, publicações)
- [ ] Backup V1 antes de desativar

---

## 📝 TEMPLATES V1 DISPONÍVEIS PARA MIGRAÇÃO

A tabela `templates` do V1 contém atualmente **5 templates**:

1. Template #63 - Passagem Aérea (analisado acima)
2. Template #244
3. Template #647
4. Template #413
5. Template #16

**Nota**: Nenhum template tem campo `nome` explícito no V1, apenas IDs numéricos.
