// scripts/cloudinary-list-today.js
// Lista imagens criadas hoje no Cloudinary

const https = require('https');
const path = require('path');
const fs = require('fs');

// Carregar variáveis do .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const CLOUD_NAME = envVars.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dxgj4bcch';
const API_KEY = envVars.CLOUDINARY_API_KEY;
const API_SECRET = envVars.CLOUDINARY_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error('❌ CLOUDINARY_API_KEY ou CLOUDINARY_API_SECRET não encontrados no .env.local');
  process.exit(1);
}

// Data de hoje em formato ISO
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD

console.log(`🔍 Buscando imagens criadas em: ${todayISO}`);
console.log(`☁️  Cloud: ${CLOUD_NAME}\n`);

// Autenticação Basic Auth
const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

function listResources(nextCursor = null) {
  return new Promise((resolve, reject) => {
    let url = `/v1_1/${CLOUD_NAME}/resources/image?max_results=500`;
    if (nextCursor) {
      url += `&next_cursor=${nextCursor}`;
    }

    const options = {
      hostname: 'api.cloudinary.com',
      path: url,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function findTodayImages() {
  const todayImages = [];
  let nextCursor = null;
  let totalChecked = 0;

  do {
    try {
      const response = await listResources(nextCursor);
      const resources = response.resources || [];

      totalChecked += resources.length;
      console.log(`📦 Verificando lote de ${resources.length} imagens... (total verificado: ${totalChecked})`);

      for (const resource of resources) {
        const createdDate = resource.created_at.split('T')[0]; // YYYY-MM-DD

        if (createdDate === todayISO) {
          todayImages.push({
            public_id: resource.public_id,
            secure_url: resource.secure_url,
            created_at: resource.created_at,
            format: resource.format,
            width: resource.width,
            height: resource.height,
            bytes: resource.bytes
          });
        }
      }

      nextCursor = response.next_cursor;

      // Se não encontrou nenhuma imagem de hoje neste lote e já passou da data,
      // pode parar (assumindo que vêm em ordem cronológica reversa)
      if (resources.length > 0) {
        const lastDate = resources[resources.length - 1].created_at.split('T')[0];
        if (lastDate < todayISO && todayImages.length === 0) {
          console.log(`⏭️  Pulando lotes mais antigos (última data: ${lastDate})`);
          break;
        }
      }

    } catch (error) {
      console.error('❌ Erro ao buscar recursos:', error.message);
      break;
    }

    // Limite de segurança: não buscar mais de 10 lotes (5000 imagens)
    if (totalChecked >= 5000) {
      console.log('⚠️  Limite de 5000 imagens alcançado, parando busca.');
      break;
    }

  } while (nextCursor);

  console.log('\n' + '='.repeat(80));
  console.log(`📊 IMAGENS CRIADAS HOJE (${todayISO})`);
  console.log('='.repeat(80) + '\n');

  if (todayImages.length === 0) {
    console.log('❌ Nenhuma imagem criada hoje foi encontrada.\n');
  } else {
    todayImages.forEach((img, index) => {
      console.log(`${index + 1}. public_id: ${img.public_id}`);
      console.log(`   URL: ${img.secure_url}`);
      console.log(`   Formato: ${img.format} | Tamanho: ${img.width}x${img.height} | ${(img.bytes / 1024).toFixed(2)} KB`);
      console.log(`   Criado em: ${img.created_at}\n`);
    });
  }

  console.log(`\n📈 Resumo:`);
  console.log(`Total de imagens verificadas: ${totalChecked}`);
  console.log(`Imagens criadas hoje: ${todayImages.length}`);
}

findTodayImages().catch(console.error);
