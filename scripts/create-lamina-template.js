/**
 * Cria template Card WhatsApp (Lâmina V1) no formato EditorElement V2
 * Layout: grid 2×2 com 4 destinos, canvas 1080×1920
 * Binds seguem convenção V1: lam_d{n}_{campo}
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cores do V1 (paleta Verde — default)
const BG_COLOR = '#0B1D3A';        // Fundo escuro
const ACCENT = '#D4E600';          // Verde limão (destaque)
const TEXT_WHITE = '#FFFFFF';
const TEXT_SUB = 'rgba(255,255,255,0.7)';
const BORDER = 'rgba(255,255,255,0.4)';

// URLs dos ícones fixos do V1 (lamina.html:294-296)
const IC_L = 'https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_51_3_suuhzf.png';
const IC_M = 'https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_50_3_juxelf.png';
const IC_R = 'https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982257/icones_49_3_yupsnv.png';

// Posições dos 4 cards (grid 2×2)
const CARD_POSITIONS = [
  { x: 55, y: 420 },  // D1 — topo esquerdo
  { x: 560, y: 420 }, // D2 — topo direito
  { x: 55, y: 820 },  // D3 — baixo esquerdo
  { x: 560, y: 820 }, // D4 — baixo direito
];

/**
 * Gera elementos de um card de destino
 */
function gerarCardDestino(n, x, y) {
  const prefix = `lam_d${n}_`;
  const elements = [];
  let id = 0;

  // Badge com nome do destino (borda + texto)
  elements.push({
    id: `d${n}_badge_border`,
    type: 'rect',
    name: `D${n} Badge Border`,
    x, y,
    width: 300, height: 36,
    fill: 'transparent',
    stroke: BORDER,
    strokeWidth: 1.5,
    cornerRadius: 18,
    opacity: 1,
  });

  elements.push({
    id: `d${n}_destino`,
    type: 'text',
    name: `D${n} Destino`,
    x: x + 18, y: y + 4,
    width: 280, height: 28,
    text: '[destino]',
    fontSize: 20,
    fontFamily: 'Helvetica Neue Bold',
    fill: ACCENT,
    align: 'left',
    verticalAlign: 'middle',
    bindParam: `${prefix}destino`,
    textTransform: 'uppercase',
    opacity: 1,
  });

  // Período (data formatada: 23 a 28/03)
  elements.push({
    id: `d${n}_periodo`,
    type: 'text',
    name: `D${n} Período`,
    x: x + 4, y: y + 80,
    width: 460, height: 40,
    text: '[periodo]',
    fontSize: 36,
    fontFamily: 'Helvetica Neue Bold',
    fill: TEXT_WHITE,
    align: 'left',
    bindParam: `${prefix}periodo`,
    opacity: 1,
  });

  // Ícones fixos (3 ícones de 26×26, gap 34px) — URLs hardcoded do V1
  elements.push({
    id: `d${n}_ico_l`,
    type: 'image',
    name: `D${n} Ícone Esq`,
    x: x + 4, y: y + 90,
    width: 26, height: 26,
    src: IC_L,
    imageFit: 'contain',
    opacity: 1,
  });

  elements.push({
    id: `d${n}_ico_m`,
    type: 'image',
    name: `D${n} Ícone Centro`,
    x: x + 38, y: y + 90,
    width: 26, height: 26,
    src: IC_M,
    imageFit: 'contain',
    opacity: 1,
  });

  elements.push({
    id: `d${n}_ico_r`,
    type: 'image',
    name: `D${n} Ícone Dir`,
    x: x + 72, y: y + 90,
    width: 26, height: 26,
    src: IC_R,
    imageFit: 'contain',
    opacity: 1,
  });

  // Incluso (cor accent)
  elements.push({
    id: `d${n}_incluso`,
    type: 'text',
    name: `D${n} Incluso`,
    x: x + 4, y: y + 138,
    width: 460, height: 22,
    text: '[incluso]',
    fontSize: 18,
    fontFamily: 'Helvetica Neue',
    fill: ACCENT,
    align: 'left',
    bindParam: `${prefix}incluso`,
    opacity: 1,
  });

  // Saída + Voo — renderiza "Saída: [saida]  [voo]" mas usa bind composto
  // (PreviewStage resolve concatenando saida + voo)
  elements.push({
    id: `d${n}_saida_voo`,
    type: 'text',
    name: `D${n} Saída + Voo`,
    x: x + 4, y: y + 162,
    width: 460, height: 20,
    text: 'Saída: [saida]  [voo]',
    fontSize: 17,
    fontFamily: 'Helvetica Neue',
    fill: TEXT_WHITE,
    align: 'left',
    bindParam: `${prefix}saida_voo`,
    opacity: 1,
  });

  // Hotel
  elements.push({
    id: `d${n}_hotel`,
    type: 'text',
    name: `D${n} Hotel`,
    x: x + 4, y: y + 184,
    width: 460, height: 20,
    text: 'Hotel: [hotel]',
    fontSize: 17,
    fontFamily: 'Helvetica Neue',
    fill: TEXT_WHITE,
    align: 'left',
    bindParam: `${prefix}hotel`,
    opacity: 1,
  });

  // Forma de pagamento (uppercase, cor sub)
  elements.push({
    id: `d${n}_pgto`,
    type: 'text',
    name: `D${n} Forma Pgto`,
    x: x + 4, y: y + 210,
    width: 460, height: 18,
    text: '[pgto]',
    fontSize: 15,
    fontFamily: 'Helvetica Neue Bold',
    fill: TEXT_SUB,
    align: 'left',
    bindParam: `${prefix}pgto`,
    textTransform: 'uppercase',
    opacity: 1,
  });

  // Parcelas (ex: "12x")
  elements.push({
    id: `d${n}_parc`,
    type: 'text',
    name: `D${n} Parcelas`,
    x: x + 4, y: y + 236,
    width: 100, height: 24,
    text: '[parc]',
    fontSize: 20,
    fontFamily: 'Helvetica Neue',
    fill: TEXT_WHITE,
    align: 'left',
    bindParam: `${prefix}parc`,
    opacity: 1,
  });

  // Preço — layout especial: R$ pequeno | INTEIRO grande | ,centavos pequeno
  // Seguindo o padrão do V1: todos na mesma baseline

  // R$ (pequeno, peso 400)
  elements.push({
    id: `d${n}_rs`,
    type: 'text',
    name: `D${n} R$`,
    x: x + 4, y: y + 264,
    width: 32, height: 24,
    text: 'R$',
    fontSize: 18,
    fontFamily: 'Helvetica Neue',
    fill: ACCENT,
    align: 'left',
    opacity: 1,
  });

  // Inteiro (grande, peso 700)
  elements.push({
    id: `d${n}_valor_int`,
    type: 'text',
    name: `D${n} Valor Inteiro`,
    x: x + 38, y: y + 244,
    width: 180, height: 48,
    text: '[valorint]',
    fontSize: 44,
    fontFamily: 'Helvetica Neue Bold',
    fill: ACCENT,
    align: 'left',
    bindParam: `${prefix}valorint`,
    opacity: 1,
  });

  // Centavos (pequeno, peso 400, y ajustado para baseline)
  elements.push({
    id: `d${n}_valor_dec`,
    type: 'text',
    name: `D${n} Centavos`,
    x: x + 220, y: y + 264,
    width: 36, height: 24,
    text: '[valdec]',
    fontSize: 18,
    fontFamily: 'Helvetica Neue',
    fill: TEXT_WHITE,
    align: 'left',
    bindParam: `${prefix}valdec`,
    opacity: 1,
  });

  // Total (à vista)
  elements.push({
    id: `d${n}_total`,
    type: 'text',
    name: `D${n} Total`,
    x: x + 4, y: y + 312,
    width: 460, height: 18,
    text: '[total]',
    fontSize: 15,
    fontFamily: 'Helvetica Neue',
    fill: TEXT_SUB,
    align: 'left',
    bindParam: `${prefix}total`,
    opacity: 1,
  });

  return elements;
}

/**
 * Template completo
 */
const template = {
  background: BG_COLOR,
  duration: 5,
  qtdDestinos: 4,
  formType: 'card_whatsapp',
  elements: [
    // Fundo
    {
      id: 'bg',
      type: 'image',
      name: 'Fundo',
      x: 0, y: 0,
      width: 1080, height: 1920,
      bindParam: 'img_fundo',
      imageFit: 'cover',
      opacity: 1,
    },

    // Overlay escuro (caso tenha imagem de fundo)
    {
      id: 'overlay',
      type: 'rect',
      name: 'Overlay',
      x: 0, y: 0,
      width: 1080, height: 1920,
      fill: BG_COLOR,
      opacity: 0.75,
    },

    // Título 1
    {
      id: 'titulo1',
      type: 'text',
      name: 'Título 1',
      x: 40, y: 160,
      width: 1000, height: 50,
      text: '[titulo1]',
      fontSize: 47,
      fontFamily: 'Helvetica Neue Bold',
      fill: TEXT_WHITE,
      align: 'center',
      bindParam: 'lam_titulo1',
      opacity: 1,
    },

    // Título 2
    {
      id: 'titulo2',
      type: 'text',
      name: 'Título 2',
      x: 40, y: 220,
      width: 1000, height: 60,
      text: '[titulo2]',
      fontSize: 54,
      fontFamily: 'Helvetica Neue',
      fill: TEXT_WHITE,
      align: 'center',
      bindParam: 'lam_titulo2',
      opacity: 1,
    },

    // Cards dos 4 destinos
    ...gerarCardDestino(1, CARD_POSITIONS[0].x, CARD_POSITIONS[0].y),
    ...gerarCardDestino(2, CARD_POSITIONS[1].x, CARD_POSITIONS[1].y),
    ...gerarCardDestino(3, CARD_POSITIONS[2].x, CARD_POSITIONS[2].y),
    ...gerarCardDestino(4, CARD_POSITIONS[3].x, CARD_POSITIONS[3].y),

    // Logo da loja (rodapé, centralizado)
    {
      id: 'logo_loja',
      type: 'image',
      name: 'Logo Loja',
      x: 880, y: 1800,
      width: 160, height: 80,
      bindParam: 'logo_loja',
      imageFit: 'contain',
      opacity: 0.95,
    },
  ],
};

// Função principal
async function main() {
  console.log('=== TEMPLATE CARD WHATSAPP (LÂMINA V1) ===\n');
  console.log('Canvas: 1080 × 1920');
  console.log('Destinos: 4 (grid 2×2)');
  console.log('Total elementos:', template.elements.length);
  console.log('');

  // Mostrar preview de alguns elementos
  console.log('=== PREVIEW (primeiros 5 elementos) ===');
  console.log(JSON.stringify(template.elements.slice(0, 5), null, 2));
  console.log('...\n');

  console.log('=== ELEMENTOS DO DESTINO 1 ===');
  const d1Elements = template.elements.filter(e => e.id?.startsWith('d1_'));
  console.log('Total:', d1Elements.length);
  d1Elements.forEach(e => {
    console.log(`  ${e.id.padEnd(20)} — ${e.name} (${e.type}${e.bindParam ? ', bind: ' + e.bindParam : ''})`);
  });
  console.log('');

  // Perguntar confirmação
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Inserir no banco? (s/N): ', async (answer) => {
    if (answer.toLowerCase() === 's') {
      try {
        const { data, error } = await sb
          .from('system_config')
          .upsert({
            key: 'tmpl_base_card_whatsapp_stories',
            value: template,
          });

        if (error) throw error;

        console.log('\n✅ Template inserido com sucesso!');
        console.log('Key: tmpl_base_card_whatsapp_stories');
      } catch (err) {
        console.error('\n❌ Erro:', err.message);
      }
    } else {
      console.log('\n❌ Cancelado.');
    }

    rl.close();
    process.exit(0);
  });
}

main();
