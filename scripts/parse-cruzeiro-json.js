// Parsear e exibir JSON do template Cruzeiro
import { readFileSync, writeFileSync } from 'fs';

const raw = readFileSync('scripts/cruzeiro-v1-template.json', 'utf-8');
const template = JSON.parse(JSON.parse(raw)); // Double parse pois está como string

console.log('\n════════════════════════════════════════════════════════');
console.log(`TEMPLATE CRUZEIRO - ${template.objects.length} OBJETOS`);
console.log('════════════════════════════════════════════════════════\n');

template.objects.forEach((obj, i) => {
  console.log(`\n─── Objeto ${i + 1} / ${template.objects.length} ───`);
  console.log(`type: ${obj.type}`);
  console.log(`bindParam: "${obj.bindParam || ''}"`);
  console.log(`x: ${obj.left}, y: ${obj.top}`);
  console.log(`width: ${obj.width}, height: ${obj.height}`);

  if (obj.type === 'textbox') {
    console.log(`fontSize: ${obj.fontSize}`);
    console.log(`fontFamily: "${obj.fontFamily}"`);
    console.log(`fontWeight: ${obj.fontWeight}`);
    console.log(`fill: "${obj.fill}"`);
    console.log(`text: "${obj.text}"`);
    console.log(`textAlign: "${obj.textAlign}"`);
    console.log(`charSpacing: ${obj.charSpacing}`);
    console.log(`lineHeight: ${obj.lineHeight}`);
  }

  if (obj.type === 'image') {
    console.log(`src: "${obj.src || ''}"`);
    console.log(`scaleX: ${obj.scaleX}, scaleY: ${obj.scaleY}`);
  }

  console.log(`scaleX: ${obj.scaleX}, scaleY: ${obj.scaleY}`);
});

console.log(`\nBackground: ${template.background}`);
console.log(`\nVersion: ${template.version}\n`);

// Salvar formatado
writeFileSync('scripts/cruzeiro-v1-parsed.json', JSON.stringify(template, null, 2));
console.log('✅ Salvo em scripts/cruzeiro-v1-parsed.json\n');
