// Diagnóstico dos binds do Cruzeiro e lista de navios
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function diagnose() {
  try {
    console.log('\n=== DIAGNÓSTICO 1: BINDS DO CRUZEIRO ===\n');

    console.log('📋 Campos esperados do CruzeiroForm:\n');
    const expectedFields = [
      'navio',
      'dataperiodo',
      'itinerario',
      'incluso',
      'forma_pgto',
      'valorparcela',
      'parcelas',
      'valortotaltexto',
    ];

    expectedFields.forEach(field => {
      console.log(`   ✓ ${field}`);
    });

    console.log('\n📝 Fluxo esperado:');
    console.log('   1. CruzeiroForm usa set(campo, valor)');
    console.log('   2. useFormAdapter.set() → setField(campo, valor)');
    console.log('   3. PublicarPageBase.values[campo] = valor');
    console.log('   4. previewValues = { ...values, ...badges }');
    console.log('   5. PreviewStage recebe previewValues');
    console.log('   6. resolveBindParam(bindParam, previewValues)');

    console.log('\n🔍 Verificar no console do browser:');
    console.log('   - PreviewStage deve logar: "valuesKeys:" + array de chaves');
    console.log('   - Se navio, itinerario, incluso estão no array');
    console.log('   - Se os valores estão preenchidos');

    console.log('\n⚠️  POSSÍVEL PROBLEMA:');
    console.log('   Se dataperiodo não aparece em valuesKeys:');
    console.log('   → CruzeiroForm NÃO está setando dataperiodo diretamente');
    console.log('   → Ele é derivado via useEffect de dataida + datavolta');
    console.log('   → Verificar se o useEffect está rodando');

    console.log('\n💡 SOLUÇÃO ESPERADA:');
    console.log('   CruzeiroForm já tem useEffect (linha ~1349):');
    console.log('   set("dataperiodo", formatPeriodo(ida, volta))');
    console.log('   → Este set() deve popular values.dataperiodo');
    console.log('   → Que vai para previewValues.dataperiodo');
    console.log('   → PreviewStage case "dataperiodo" já existe (adicionado hoje)');

    console.log('\n\n=== DIAGNÓSTICO 2: LISTA DE NAVIOS ===\n');

    // Buscar navios do V1
    console.log('🚢 Buscando navios do V1...\n');

    // Tentar buscar da tabela navios
    const tables = ['navios', 'navio', 'ships', 'ship'];
    let naviosV1 = [];

    for (const table of tables) {
      try {
        const { data, error } = await supabaseV1
          .from(table)
          .select('*')
          .limit(50);

        if (!error && data && data.length > 0) {
          console.log(`✅ Encontrado na tabela "${table}": ${data.length} registros\n`);
          naviosV1 = data;
          data.forEach((row, i) => {
            const name = row.name || row.nome || row.navio || JSON.stringify(row);
            console.log(`   ${i + 1}. ${name}`);
          });
          break;
        }
      } catch (e) {
        // tabela não existe, continuar
      }
    }

    if (naviosV1.length === 0) {
      console.log('⚠️  Nenhuma tabela de navios encontrada no V1');
      console.log('   Os navios podem estar hardcoded no client.js do V1\n');

      console.log('📋 NAVIOS_DEFAULT atual no V2 (FormSections.tsx:37):\n');
      const naviosV2 = [
        "MSC Seashore", "MSC Grandiosa", "MSC Musica", "MSC Armonia",
        "MSC Magnifica", "Costa Fascinosa", "Costa Diadema",
        "Norwegian Jade", "Carnival Jubilee",
      ];
      naviosV2.forEach((navio, i) => {
        console.log(`   ${i + 1}. ${navio}`);
      });

      console.log(`\n   Total: ${naviosV2.length} navios`);
      console.log('\n⚠️  Lista pode estar incompleta.');
      console.log('   Verificar client.js do V1 para lista completa.');
    } else {
      console.log('\n📊 Comparação com V2:\n');
      console.log('NAVIOS_DEFAULT atual (9 navios):');
      const naviosV2 = [
        "MSC Seashore", "MSC Grandiosa", "MSC Musica", "MSC Armonia",
        "MSC Magnifica", "Costa Fascinosa", "Costa Diadema",
        "Norwegian Jade", "Carnival Jubilee",
      ];
      naviosV2.forEach(n => console.log(`   ✓ ${n}`));

      console.log(`\nNavios do V1 (${naviosV1.length}):`);
      const naviosV1Names = naviosV1.map(r => r.name || r.nome || r.navio);
      naviosV1Names.forEach(n => console.log(`   - ${n}`));

      // Encontrar faltantes
      const faltantes = naviosV1Names.filter(n => !naviosV2.includes(n));
      if (faltantes.length > 0) {
        console.log(`\n❌ Faltam ${faltantes.length} navios no V2:`);
        faltantes.forEach(n => console.log(`   - ${n}`));
      } else {
        console.log('\n✅ Todos os navios do V1 estão no V2');
      }
    }

    console.log('\n\n=== RESUMO DOS DIAGNÓSTICOS ===\n');
    console.log('1️⃣ BINDS:');
    console.log('   → Verificar console do browser com formulário preenchido');
    console.log('   → Logar previewValues no PreviewStage');
    console.log('   → Verificar se campos aparecem em valuesKeys\n');

    console.log('2️⃣ NAVIOS:');
    if (naviosV1.length > 0) {
      console.log(`   → V1 tem ${naviosV1.length} navios na tabela`);
      console.log(`   → V2 tem 9 navios em NAVIOS_DEFAULT`);
      const faltantes = naviosV1.map(r => r.name || r.nome).filter(n => !["MSC Seashore", "MSC Grandiosa", "MSC Musica", "MSC Armonia", "MSC Magnifica", "Costa Fascinosa", "Costa Diadema", "Norwegian Jade", "Carnival Jubilee"].includes(n));
      if (faltantes.length > 0) {
        console.log(`   → Atualizar NAVIOS_DEFAULT com os ${faltantes.length} faltantes\n`);
      }
    } else {
      console.log('   → Lista hardcoded parece adequada (9 navios principais)');
      console.log('   → SearchableSelect permite digitar navios customizados\n');
    }

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

diagnose();
