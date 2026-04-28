/**
 * Análise de impacto dos conflitos de binds no PreviewStage
 */

const conflicts = {
  // Grupo 1: Binds de preço (12 conflitos)
  price_binds: [
    { bind: 'valorparcela', forms: ['PacoteForm', 'CruzeiroForm', 'PassagemForm'] },
    { bind: 'valorint', forms: ['PacoteForm', 'CruzeiroForm', 'PassagemForm'] },
    { bind: 'valdec', forms: ['PacoteForm', 'CruzeiroForm', 'PassagemForm'] },
    { bind: 'valortotal', forms: ['PacoteForm', 'CruzeiroForm', 'PassagemForm'] },
    { bind: 'valor_total_texto', forms: ['PacoteForm', 'CruzeiroForm', 'PassagemForm'] },
    { bind: 'entrada', forms: ['PacoteForm', 'CruzeiroForm', 'PassagemForm'] },
    { bind: 'parcelas', forms: ['PacoteForm', 'CruzeiroForm', 'PassagemForm'] },
    { bind: 'formapagamento', forms: ['PacoteForm', 'CruzeiroForm', 'PassagemForm'] },
    { bind: 'forma_de_pagamento', forms: ['CruzeiroForm', 'PassagemForm'] },
    { bind: 'forma_pgto', forms: ['CruzeiroForm', 'PassagemForm'] },
    { bind: 'q_vezes', forms: ['CruzeiroForm', 'PassagemForm'] },
  ],

  // Grupo 2: Binds de destino/viagem (7 conflitos)
  trip_binds: [
    { bind: 'destino', forms: ['PacoteForm', 'CampanhaForm', 'PassagemForm'] },
    { bind: 'dataida', forms: ['PacoteForm', 'CampanhaForm', 'CruzeiroForm'] },
    { bind: 'datavolta', forms: ['PacoteForm', 'CampanhaForm', 'CruzeiroForm'] },
    { bind: 'saida', forms: ['PacoteForm', 'CampanhaForm', 'PassagemForm'] },
    { bind: 'hotel', forms: ['PacoteForm', 'CampanhaForm'] },
    { bind: 'tipovoo', forms: ['PacoteForm', 'CampanhaForm'] },
    { bind: 'incluso', forms: ['CruzeiroForm', 'PassagemForm'] },
  ],

  // Grupo 3: Binds de imagem
  image_binds: [
    { bind: 'img_fundo', forms: ['CruzeiroForm', 'CardWhatsAppForm'] },
  ],
};

console.log('=== ANÁLISE DE IMPACTO DOS CONFLITOS ===\n');

console.log('📊 GRUPO 1: BINDS DE PREÇO (11 conflitos)\n');
console.log('Binds relacionados a valores, pagamento e parcelas.\n');
conflicts.price_binds.forEach(({ bind, forms }) => {
  console.log(`  ❌ "${bind}"`);
  console.log(`     Usado em: ${forms.join(', ')}`);
});

console.log('\n🔍 IMPACTO:');
console.log('  CRÍTICO — Quando o usuário alterna entre Pacote/Cruzeiro/Passagem,');
console.log('  os valores de preço podem "vazar" de um form para outro.');
console.log('  Exemplo: preencheu valorparcela no Pacote, mudou para Cruzeiro,');
console.log('  o PreviewStage pode exibir o valor do Pacote no template do Cruzeiro.\n');

console.log('💡 SOLUÇÃO:');
console.log('  Usar prefixos nos binds de preço:');
console.log('  - PacoteForm → pct_valorparcela, pct_valorint, pct_valdec...');
console.log('  - CruzeiroForm → crz_valorparcela, crz_valorint, crz_valdec...');
console.log('  - PassagemForm → psg_valorparcela, psg_valorint, psg_valdec...\n');

console.log('─'.repeat(70));
console.log('\n📊 GRUPO 2: BINDS DE DESTINO/VIAGEM (7 conflitos)\n');
conflicts.trip_binds.forEach(({ bind, forms }) => {
  console.log(`  ❌ "${bind}"`);
  console.log(`     Usado em: ${forms.join(', ')}`);
});

console.log('\n🔍 IMPACTO:');
console.log('  MODERADO — Campos como destino, dataida, saida são semanticamente');
console.log('  iguais em todos os forms. O "vazamento" pode até ser desejado');
console.log('  (usuário quer manter o mesmo destino ao trocar de form).\n');

console.log('💡 SOLUÇÃO:');
console.log('  OPÇÃO A: Manter como está (vazamento intencional, UX melhor)');
console.log('  OPÇÃO B: Adicionar prefixos para isolamento total\n');

console.log('─'.repeat(70));
console.log('\n📊 GRUPO 3: BINDS DE IMAGEM (1 conflito)\n');
conflicts.image_binds.forEach(({ bind, forms }) => {
  console.log(`  ❌ "${bind}"`);
  console.log(`     Usado em: ${forms.join(', ')}`);
});

console.log('\n🔍 IMPACTO:');
console.log('  BAIXO — img_fundo é compartilhado entre Cruzeiro e CardWhatsApp.');
console.log('  Ambos usam a mesma imagem de fundo, então o vazamento é aceitável.\n');

console.log('💡 SOLUÇÃO:');
console.log('  Manter como está (compartilhamento intencional)\n');

console.log('─'.repeat(70));
console.log('\n🎯 RESUMO DE CRITICIDADE:\n');
console.log('  🔴 CRÍTICO (11): Binds de preço devem ter prefixos');
console.log('  🟡 MODERADO (7): Binds de viagem podem compartilhar');
console.log('  🟢 BAIXO (1): Binds de imagem OK compartilhar\n');

console.log('─'.repeat(70));
console.log('\n🔧 COMO O PREVIEWSTAGE RESOLVE:\n');
console.log('PreviewStage usa o objeto `values` passado pelo form ativo.');
console.log('Quando o usuário troca de form:');
console.log('  1. O form anterior para de setar binds');
console.log('  2. O form novo começa a setar seus binds');
console.log('  3. Binds do form anterior PERMANECEM em values (não são limpos!)');
console.log('  4. Se o template do form novo usa um bind do form anterior,');
console.log('     vai pegar o valor "velho" → BUG VISUAL\n');

console.log('Exemplo prático:');
console.log('  1. Usuário preenche "valorparcela = 1.500,00" no PacoteForm');
console.log('  2. Troca para CruzeiroForm');
console.log('  3. CruzeiroForm também seta "valorparcela"');
console.log('  4. Se template do Cruzeiro usa {valorparcela}, vai mostrar "1.500,00"');
console.log('     mesmo que o usuário ainda não tenha preenchido!\n');

console.log('─'.repeat(70));
console.log('\n✅ RECOMENDAÇÃO FINAL:\n');
console.log('Adicionar prefixos aos binds de PREÇO em todos os forms:');
console.log('  - Garante isolamento entre forms');
console.log('  - Previne bugs visuais ao trocar de form');
console.log('  - Mantém valores de destino/viagem compartilhados (UX melhor)\n');
