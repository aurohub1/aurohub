// scripts/find-ship-images.js
// Busca imagens de navios no Cloudinary

const naviosSearch = [
  // Costa
  "Costa Firenze",
  "Costa Luminosa",
  "Costa Magica",
  // Norwegian
  "Norwegian Epic",
  "Norwegian Jade",
  "Norwegian Jewel",
  "Norwegian Prima",
  // Princess
  "Coral Princess",
  "Emerald Princess",
  "Golden Princess",
  "Grand Princess",
  "Island Princess",
  "Pacific Princess",
  "Ruby Princess",
  "Sapphire Princess",
  // Royal Caribbean
  "Brilliance of the Seas",
  "Grandeur of the Seas",
  "Utopia of the Seas",
  // Celebrity
  "Celebrity Beyond",
  "Celebrity Millennium",
];

function generateVariations(navio) {
  const variations = [];
  const base = navio.toLowerCase();

  // Variação 1: lowercase com underscores
  variations.push(base.replace(/ /g, '_'));

  // Variação 2: lowercase sem espaços
  variations.push(base.replace(/ /g, ''));

  // Variação 3: lowercase com hífens
  variations.push(base.replace(/ /g, '-'));

  // Variação 4: só primeira palavra
  variations.push(base.split(' ')[base.split(' ').length - 1]);

  // Variação 5: com prefixo da companhia
  if (navio.includes('Princess')) {
    const name = navio.replace(' Princess', '').toLowerCase().replace(/ /g, '_');
    variations.push(`princess_cruise_-_${name}_princess`);
    variations.push(`princess_-_${name}`);
  }

  if (navio.includes('of the Seas')) {
    const name = navio.replace(' of the Seas', '').toLowerCase().replace(/ /g, '_');
    variations.push(`royal_caribbean_-_${navio.toLowerCase().replace(/ /g, '_')}`);
    variations.push(`royal_${name}`);
  }

  if (navio.startsWith('Celebrity')) {
    const name = navio.replace('Celebrity ', '').toLowerCase();
    variations.push(`x_celebrity_cruise_-_${name}`);
    variations.push(`x_celebrity_${name}`);
    variations.push(`celebrity_${name}`);
  }

  return [...new Set(variations)]; // Remove duplicatas
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function findShipImages() {
  const found = {};

  for (const navio of naviosSearch) {
    console.log(`\n🔍 Buscando: ${navio}`);
    const variations = generateVariations(navio);

    for (const variation of variations) {
      const url = `https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750765/${variation}.png`;
      const exists = await checkUrl(url);

      if (exists) {
        console.log(`  ✅ Encontrado: ${variation}`);
        const key = navio.toUpperCase();
        if (!found[key]) found[key] = [];
        found[key].push(url);
      }
    }

    if (!found[navio.toUpperCase()]) {
      console.log(`  ❌ Nenhuma variação encontrada`);
    }
  }

  console.log('\n\n📊 RESULTADOS:');
  console.log('='.repeat(60));

  Object.entries(found).forEach(([navio, urls]) => {
    console.log(`\n'${navio}': [${urls.map(u => `'${u}'`).join(', ')}],`);
  });

  console.log('\n\n📈 Resumo:');
  console.log(`Total buscado: ${naviosSearch.length}`);
  console.log(`Total encontrado: ${Object.keys(found).length}`);
  console.log(`Faltando: ${naviosSearch.length - Object.keys(found).length}`);
}

findShipImages().catch(console.error);
