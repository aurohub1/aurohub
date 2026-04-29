// scripts/test-email.js
// Script para testar envio de email via Resend

const { Resend } = require('resend')
const path = require('path')
const fs = require('fs')

// Carregar variáveis do .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

const envVars = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=')
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  }
})

const RESEND_API_KEY = envVars.RESEND_API_KEY

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY não encontrada no .env.local')
  process.exit(1)
}

const resend = new Resend(RESEND_API_KEY)

async function sendTestEmail() {
  try {
    console.log('📧 Enviando email de teste...')

    const { data, error } = await resend.emails.send({
      from: 'Aurohub <noreply@aurovista.com.br>',
      to: 'contato@aurovista.com.br',
      subject: 'Teste Resend — Aurohub',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #f5f5f5;
              margin: 0;
              padding: 40px 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              padding: 32px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #D4A843;
              margin: 0 0 16px;
              font-size: 24px;
            }
            p {
              color: #333;
              line-height: 1.6;
              margin: 0 0 12px;
            }
            .badge {
              display: inline-block;
              background: linear-gradient(135deg, #D4A843, #FF7A1A);
              color: white;
              padding: 8px 16px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .footer {
              margin-top: 24px;
              padding-top: 24px;
              border-top: 1px solid #eee;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Email de Teste</h1>
            <p><span class="badge">Resend + Aurohub</span></p>
            <p>Este é um email de teste enviado via <strong>Resend API</strong>.</p>
            <p>Se você recebeu esta mensagem, significa que a integração está funcionando corretamente!</p>
            <p><strong>Configuração:</strong></p>
            <ul>
              <li>Serviço: Resend</li>
              <li>Projeto: Aurohub</li>
              <li>Remetente: noreply@aurovista.com.br</li>
              <li>Data: ${new Date().toLocaleString('pt-BR')}</li>
            </ul>
            <div class="footer">
              Aurohub — Sistema de Gestão de Publicações<br>
              <a href="https://aurohub.app" style="color: #D4A843;">aurohub.app</a>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('❌ Erro ao enviar email:', error)
      process.exit(1)
    }

    console.log('✅ Email enviado com sucesso!')
    console.log('📨 ID:', data?.id)
    console.log('📧 Para: contato@aurovista.com.br')
    console.log('📝 Assunto: Teste Resend — Aurohub')
  } catch (err) {
    console.error('❌ Erro:', err)
    process.exit(1)
  }
}

sendTestEmail()
