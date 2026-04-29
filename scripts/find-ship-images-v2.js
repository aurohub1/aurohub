// scripts/find-ship-images-v2.js
// Busca imagens de navios no Cloudinary com mais variações

const naviosSearch = [
  { name: "Costa Firenze", variations: ["costa_firenze", "firenze", "costa_firenze1", "costa_firenze_2"] },
  { name: "Costa Luminosa", variations: ["costa_luminosa", "luminosa", "costa_luminosa1", "costa_luminosa_2"] },
  { name: "Costa Magica", variations: ["costa_magica", "magica", "costa_magica1", "costa_magica_2"] },
  { name: "Norwegian Epic", variations: ["norwegian_epic", "norwegian_epic1", "norwegian_epic2", "epic"] },
  { name: "Norwegian Jade", variations: ["norwegian_jade", "norwegian_jade1", "norwegian_jade2", "jade"] },
  { name: "Norwegian Jewel", variations: ["norwegian_jewel", "norwegian_jewel1", "norwegian_jewel2", "jewel"] },
  { name: "Norwegian Prima", variations: ["norwegian_prima", "norwegian_prima1", "norwegian_prima2", "prima"] },
  { name: "Coral Princess", variations: ["princess_cruise_-_coral_princess", "princess_coral", "coral_princess"] },
  { name: "Emerald Princess", variations: ["princess_cruise_-_emerald_princess", "princess_emerald", "emerald_princess"] },
  { name: "Golden Princess", variations: ["princess_cruise_-_golden_princess", "princess_golden", "golden_princess"] },
  { name: "Grand Princess", variations: ["princess_cruise_-_grand_princess", "princess_grand", "grand_princess"] },
  { name: "Island Princess", variations: ["princess_cruise_-_island_princess", "princess_island", "island_princess"] },
  { name: "Pacific Princess", variations: ["princess_cruise_-_pacific_princess", "princess_pacific", "pacific_princess"] },
  { name: "Ruby Princess", variations: ["princess_cruise_-_ruby_princess", "princess_ruby", "ruby_princess"] },
  { name: "Sapphire Princess", variations: ["princess_cruise_-_sapphire_princess", "princess_sapphire", "sapphire_princess"] },
  { name: "Brilliance of the Seas", variations: ["royal_caribbean_-_brilliance_of_the_seas", "royal_brilliance", "brilliance_of_the_seas"] },
  { name: "Grandeur of the Seas", variations: ["royal_caribbean_-_grandeur_of_the_seas", "royal_grandeur", "grandeur_of_the_seas"] },
  { name: "Utopia of the Seas", variations: ["royal_caribbean_-_utopia_of_the_seas", "royal_utopia", "utopia_of_the_seas", "royal_utopia_of_the_seas"] },
  { name: "Celebrity Beyond", variations: ["x_celebrity_cruise_-_beyond", "x_celebrity_beyond", "celebrity_beyond", "beyond"] },
  { name: "Celebrity Millennium", variations: ["x_celebrity_cruise_-_millennium", "x_celebrity_millennium", "celebrity_millennium", "millennium"] },
];

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
  let totalTests = 0;

  for (const ship of naviosSearch) {
    console.log(`\n🔍 Buscando: ${ship.name}`);

    for (const variation of ship.variations) {
      totalTests++;
      // Testa sem versão (Cloudinary pode fazer auto-redirect)
      const url = `https://res.cloudinary.com/dxgj4bcch/image/upload/${variation}.png`;
      const exists = await checkUrl(url);

      if (exists) {
        console.log(`  ✅ Encontrado: ${variation}`);
        const key = ship.name.toUpperCase();
        if (!found[key]) found[key] = [];
        found[key].push(url);
      }
    }

    if (!found[ship.name.toUpperCase()]) {
      console.log(`  ❌ Nenhuma variação encontrada`);
    }
  }

  console.log('\n\n📊 RESULTADOS:');
  console.log('='.repeat(60));

  if (Object.keys(found).length > 0) {
    Object.entries(found).forEach(([navio, urls]) => {
      console.log(`\n'${navio}': [${urls.map(u => `'${u}'`).join(', ')}],`);
    });
  } else {
    console.log('\nNenhuma imagem encontrada.');
  }

  console.log('\n\n📈 Resumo:');
  console.log(`Total de navios buscados: ${naviosSearch.length}`);
  console.log(`Total de variações testadas: ${totalTests}`);
  console.log(`Navios com imagens encontradas: ${Object.keys(found).length}`);
  console.log(`Navios ainda faltando: ${naviosSearch.length - Object.keys(found).length}`);
}

findShipImages().catch(console.error);
