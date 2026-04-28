const fs = require('fs');
const content = fs.readFileSync('src/components/publish/FormSections.tsx', 'utf8');

// Encontrar limites de cada form (export function XxxForm)
const formBoundaries = [];
const formRegex = /export function (\w+Form)\(/g;
let match;
while ((match = formRegex.exec(content)) !== null) {
  formBoundaries.push({ name: match[1], start: match.index });
}

// Adicionar fim de cada form (início do próximo ou fim do arquivo)
for (let i = 0; i < formBoundaries.length; i++) {
  formBoundaries[i].end = i < formBoundaries.length - 1
    ? formBoundaries[i + 1].start
    : content.length;
}

// Extrair binds de cada form
const bindsByForm = {};
formBoundaries.forEach(form => {
  const formContent = content.substring(form.start, form.end);
  const binds = new Set();
  let m;
  // Procura por set("bind", ...) ou set('bind', ...) ou set(`bind`, ...)
  const regex = /set\(["'`]([^"'`]+)["'`]/g;
  while ((m = regex.exec(formContent)) !== null) {
    binds.add(m[1]);
  }
  bindsByForm[form.name] = Array.from(binds).sort();
});

// Imprimir resultado
console.log('=== BINDS POR FORM TYPE ===\n');
Object.entries(bindsByForm).forEach(([form, binds]) => {
  console.log(`${form} (${binds.length} binds):`);
  binds.forEach(b => console.log(`  • ${b}`));
  console.log('');
});

// Encontrar conflitos (binds com mesmo nome em forms diferentes)
console.log('=== ANÁLISE DE CONFLITOS ===\n');
const allBinds = {};
Object.entries(bindsByForm).forEach(([form, binds]) => {
  binds.forEach(bind => {
    if (!allBinds[bind]) allBinds[bind] = [];
    allBinds[bind].push(form);
  });
});

const conflicts = Object.entries(allBinds)
  .filter(([_, forms]) => forms.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

if (conflicts.length) {
  console.log(`Total de binds com conflito: ${conflicts.length}\n`);
  conflicts.forEach(([bind, forms]) => {
    console.log(`❌ "${bind}" usado em ${forms.length} forms:`);
    forms.forEach(f => console.log(`   - ${f}`));
    console.log('');
  });
} else {
  console.log('✅ Nenhum conflito encontrado!\n');
}

// Estatísticas
console.log('=== ESTATÍSTICAS ===\n');
const totalBinds = Object.keys(allBinds).length;
const conflictBinds = conflicts.length;
const cleanBinds = totalBinds - conflictBinds;
console.log(`Total de binds únicos: ${totalBinds}`);
console.log(`Binds sem conflito: ${cleanBinds}`);
console.log(`Binds com conflito: ${conflictBinds}`);
console.log(`Taxa de conflito: ${(conflictBinds / totalBinds * 100).toFixed(1)}%`);
