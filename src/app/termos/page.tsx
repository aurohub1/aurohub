export const metadata = {
  title: "Termos de Uso — Aurohub",
  description: "Termos de Uso da plataforma Aurohub para agências de viagem.",
};

export default function TermosPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb", fontFamily: "'Inter', sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", height: 64, display: "flex", alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://res.cloudinary.com/dxgj4bcch/image/upload/v1774115445/Logo_com_fundo_trans22_1_wujniv.png"
            alt="Aurohub"
            style={{ height: 32, width: 32, objectFit: "contain", filter: "brightness(0) saturate(100%) invert(52%) sepia(98%) saturate(600%) hue-rotate(360deg) brightness(95%)" }}
          />
          <span style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Aurohub</span>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>Termos de Uso</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Última atualização: maio de 2026 · Versão 1.0</p>
        </div>

        <Section title="1. Aceitação dos Termos">
          <p>
            Ao acessar ou utilizar a plataforma Aurohub, você concorda com estes Termos de Uso e com nossa
            Política de Privacidade. Caso não concorde com qualquer disposição, interrompa o uso imediatamente.
          </p>
          <p>
            Estes termos constituem um contrato vinculante entre você (pessoa física ou jurídica) e a
            <strong> AuroVista Tecnologia Ltda.</strong>, CNPJ 00.000.000/0001-00, com sede em São José do Rio Preto — SP.
          </p>
        </Section>

        <Section title="2. Uso Aceitável da Plataforma">
          <p>O Aurohub é uma plataforma SaaS destinada à criação, edição e publicação de conteúdo visual para agências de viagem. Você pode utilizar a plataforma para:</p>
          <ul>
            <li>Criar e publicar imagens e vídeos promocionais nos formatos disponíveis;</li>
            <li>Gerenciar usuários e unidades vinculadas à sua conta;</li>
            <li>Agendar publicações nas redes sociais conectadas;</li>
            <li>Acessar métricas e histórico de publicações.</li>
          </ul>
          <p>O uso da plataforma está condicionado ao pagamento das mensalidades e ao cumprimento integral destes termos.</p>
        </Section>

        <Section title="3. Responsabilidade pelo Conteúdo Publicado">
          <p>
            Você é <strong>exclusivamente responsável</strong> por todo conteúdo criado, armazenado ou publicado
            por meio da plataforma Aurohub, incluindo textos, imagens, vídeos e legendas.
          </p>
          <p>Ao publicar conteúdo, você declara e garante que:</p>
          <ul>
            <li>Possui todos os direitos necessários sobre o conteúdo (autoral, de imagem, marcas registradas);</li>
            <li>O conteúdo não viola direitos de terceiros;</li>
            <li>O conteúdo está em conformidade com as políticas das redes sociais onde será publicado (Instagram, Facebook);</li>
            <li>O conteúdo respeita a legislação brasileira vigente.</li>
          </ul>
          <p>
            A AuroVista Tecnologia não monitora previamente o conteúdo publicado e não se responsabiliza por
            danos decorrentes de publicações feitas pelos usuários.
          </p>
        </Section>

        <Section title="4. Condutas Proibidas">
          <p>É expressamente proibido utilizar o Aurohub para:</p>
          <ul>
            <li>Publicar conteúdo ilícito, difamatório, discriminatório, obsceno ou que viole direitos de terceiros;</li>
            <li>Realizar spam, envio em massa não solicitado ou práticas abusivas nas redes sociais;</li>
            <li>Compartilhar credenciais de acesso com terceiros não autorizados;</li>
            <li>Tentar acessar dados de outros clientes ou realizar ataques à infraestrutura da plataforma;</li>
            <li>Utilizar meios automatizados (bots, scrapers) não autorizados pela AuroVista;</li>
            <li>Fazer engenharia reversa, descompilar ou modificar qualquer parte da plataforma;</li>
            <li>Usar a plataforma para fins que violem as políticas do Meta (Instagram/Facebook);</li>
            <li>Publicar conteúdo que infrinja o Código de Defesa do Consumidor ou o Código de Ética do Turismo.</li>
          </ul>
          <p>
            O descumprimento desta cláusula pode resultar na suspensão imediata da conta, sem direito a reembolso,
            e na adoção de medidas legais cabíveis.
          </p>
        </Section>

        <Section title="5. Propriedade Intelectual">
          <p>
            Todo o código-fonte, design, templates, algoritmos e conteúdos criados pela AuroVista Tecnologia
            são propriedade exclusiva da empresa e protegidos pela Lei de Direitos Autorais (Lei 9.610/1998).
          </p>
          <p>
            Os conteúdos criados pelo usuário dentro da plataforma pertencem ao usuário. Ao utilizá-los na
            plataforma, o usuário concede à AuroVista uma licença limitada, não exclusiva e intransferível para
            armazená-los e processá-los exclusivamente para a prestação do serviço.
          </p>
        </Section>

        <Section title="6. Disponibilidade e Modificações">
          <p>
            A AuroVista empenha-se para manter o Aurohub disponível 24h por dia, 7 dias por semana, com
            disponibilidade mínima de 99% mensal, exceto em janelas de manutenção previamente comunicadas.
          </p>
          <p>
            Reservamos o direito de modificar, suspender ou encerrar funcionalidades a qualquer momento,
            com notificação prévia de 15 dias para alterações relevantes.
          </p>
          <p>
            Estes Termos podem ser atualizados periodicamente. O uso continuado da plataforma após a publicação
            de novos termos constitui aceitação das alterações.
          </p>
        </Section>

        <Section title="7. Limitação de Responsabilidade">
          <p>
            A AuroVista Tecnologia não se responsabiliza por danos indiretos, lucros cessantes, perda de dados
            ou danos decorrentes de:
          </p>
          <ul>
            <li>Uso inadequado ou não autorizado da plataforma;</li>
            <li>Falhas nas APIs de terceiros (Instagram, Facebook, Cloudinary);</li>
            <li>Interrupções de serviço fora do controle da AuroVista (falhas de infraestrutura de nuvem, força maior);</li>
            <li>Conteúdo publicado pelo usuário em desacordo com estes termos.</li>
          </ul>
          <p>
            A responsabilidade total da AuroVista limita-se ao valor pago pelo usuário nos últimos 3 meses
            de contrato.
          </p>
        </Section>

        <Section title="8. Privacidade e LGPD">
          <p>
            O tratamento de dados pessoais pelo Aurohub é realizado em conformidade com a
            <strong> Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>.
          </p>
          <p>Coletamos e tratamos dados pessoais para as seguintes finalidades:</p>
          <ul>
            <li>Autenticação e gerenciamento de conta;</li>
            <li>Prestação dos serviços contratados;</li>
            <li>Comunicações sobre a plataforma (atualizações, alertas, suporte);</li>
            <li>Cumprimento de obrigações legais.</li>
          </ul>
          <p>
            Você tem direito de acessar, corrigir, portar ou solicitar a exclusão de seus dados pessoais a
            qualquer momento. Para exercer esses direitos, entre em contato pelo e-mail abaixo.
          </p>
          <p>
            Nossos servidores utilizam criptografia em trânsito (TLS) e, para dados sensíveis, criptografia
            em repouso (AES-256-GCM). Não vendemos ou compartilhamos dados pessoais com terceiros, exceto
            quando necessário para a prestação do serviço ou exigido por lei.
          </p>
        </Section>

        <Section title="9. Rescisão">
          <p>
            A AuroVista pode suspender ou encerrar sua conta imediatamente, sem aviso prévio, em caso de:
            violação destes termos, inadimplência superior a 30 dias, ou uso da plataforma para fins ilícitos.
          </p>
          <p>
            Você pode cancelar sua conta a qualquer momento mediante aviso prévio de 30 dias, conforme
            previsto no contrato de prestação de serviços.
          </p>
        </Section>

        <Section title="10. Foro e Legislação Aplicável">
          <p>
            Estes termos são regidos pela legislação brasileira. As partes elegem o Foro da Comarca de
            <strong> São José do Rio Preto — SP</strong> para dirimir quaisquer controvérsias, com renúncia
            a qualquer outro, por mais privilegiado que seja.
          </p>
        </Section>

        {/* Contact */}
        <div style={{ marginTop: 48, padding: "24px 28px", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Dúvidas ou solicitações?</h3>
          <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
            Entre em contato com nossa equipe pelo e-mail{" "}
            <a href="mailto:contato@aurovista.com.br" style={{ color: "#FF7A1A", fontWeight: 600, textDecoration: "none" }}>
              contato@aurovista.com.br
            </a>
            . Respondemos em até 2 dias úteis.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e5e7eb", background: "#fff", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
          © {new Date().getFullYear()} AuroVista Tecnologia Ltda. · Todos os direitos reservados ·{" "}
          <a href="mailto:contato@aurovista.com.br" style={{ color: "#94a3b8" }}>contato@aurovista.com.br</a>
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #FF7A1A", display: "inline-block" }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}
