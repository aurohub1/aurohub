import { Resend } from "resend";

interface WelcomeEmailData {
  name: string;
  email: string;
  tempPassword: string;
  planName: string;
  priceMonthly: number;
  briefingUrl?: string;
}

export async function sendWelcomeEmail(to: string, data: WelcomeEmailData) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const firstName = data.name.split(" ")[0];

  await resend.emails.send({
    from: "Aurohub <noreply@aurovista.com.br>",
    to,
    subject: `🎉 Bem-vindo ao Aurohub, ${firstName}! Seu acesso está pronto.`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'DM Sans',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <!-- Header -->
    <div style="background:#060D1A;padding:32px 40px;text-align:center">
      <img src="https://res.cloudinary.com/dxgj4bcch/image/upload/v1/aurohubv2/Logo_com_fundo_trans22_1_wujniv.png"
           alt="Aurovista" style="height:36px;width:auto" />
    </div>

    <!-- Body -->
    <div style="padding:40px">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0D1628">
        Olá, ${firstName}! Sua conta está pronta. 🎉
      </h1>
      <p style="margin:0 0 24px;color:#5a6a85;font-size:15px;line-height:1.6">
        Sua assinatura do <strong>Aurohub</strong> foi confirmada com sucesso.
        Veja abaixo seus dados de acesso.
      </p>

      <!-- Plan badge -->
      <div style="background:#f0f4ff;border:1px solid #dce6ff;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <div style="font-size:12px;color:#5a6a85;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Plano contratado</div>
        <div style="font-size:17px;font-weight:700;color:#1E3A6E">${data.planName}</div>
        <div style="font-size:13px;color:#5a6a85;margin-top:2px">R$ ${data.priceMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês</div>
      </div>

      <!-- Credentials -->
      <div style="background:#060D1A;border-radius:12px;padding:24px;margin-bottom:28px">
        <div style="font-size:12px;color:#6b7fa8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">Seus dados de acesso</div>
        <div style="margin-bottom:12px">
          <div style="font-size:11px;color:#6b7fa8;margin-bottom:2px">E-mail</div>
          <div style="font-size:14px;color:#e2e8f0;font-weight:500">${data.email}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#6b7fa8;margin-bottom:2px">Senha temporária</div>
          <div style="font-size:18px;color:#D4A843;font-weight:700;font-family:monospace;letter-spacing:2px">${data.tempPassword}</div>
        </div>
        <div style="margin-top:12px;font-size:11px;color:#4a5a78">Altere sua senha após o primeiro acesso.</div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px">
        <a href="https://app.aurovista.com.br/login"
           style="display:inline-block;background:#1A56C4;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px">
          Acessar minha conta →
        </a>
      </div>

      <!-- Next step -->
      <div style="border-top:1px solid #eef0f4;padding-top:24px">
        <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#0D1628">Próximo passo</p>
        <p style="margin:0 0 16px;font-size:14px;color:#5a6a85;line-height:1.6">
          Complete seu briefing para iniciarmos a implantação da sua plataforma.
        </p>
        <a href="${data.briefingUrl ?? "https://app.aurovista.com.br/briefing"}"
           style="display:inline-block;border:1.5px solid #1A56C4;color:#1A56C4;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px">
          Iniciar briefing
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafc;border-top:1px solid #eef0f4;padding:24px 40px;text-align:center">
      <p style="margin:0;font-size:12px;color:#8a9ab5">
        Dúvidas? Fale conosco em
        <a href="mailto:contato@aurovista.com.br" style="color:#1A56C4;text-decoration:none">contato@aurovista.com.br</a>
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:#b0bdd0">© ${new Date().getFullYear()} Aurovista Tecnologia. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`,
  });
}
