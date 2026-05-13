
const NUMERIC_KEYS = new Set([
  "monthly_value", "monthly_total", "setup_fee",
  "design_arte_alteracao", "design_arte_nova", "design_pack_completo", "design_pack_tv",
]);
const DATE_KEYS = new Set(["start_date", "end_date", "signed_at"]);

function fmt(value: unknown, key: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (NUMERIC_KEYS.has(key)) {
    return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (DATE_KEYS.has(key)) {
    const raw = String(value);
    const d = raw.includes("T") ? new Date(raw) : new Date(raw + "T12:00:00");
    return d.toLocaleDateString("pt-BR");
  }
  return String(value);
}

const DESIGN_DEFAULTS: Record<string, unknown> = {
  design_arte_alteracao: 97,
  design_arte_nova: 297,
  design_pack_completo: 597,
  design_pack_tv: 797,
};

export function fillTemplate(data: Record<string, unknown>): string {
  const merged = { ...DESIGN_DEFAULTS, ...data };
  let text = CONTRACT_TEMPLATE;
  for (const key of Object.keys(merged)) {
    text = text.replaceAll(`{{${key}}}`, fmt(merged[key], key));
  }
  return text;
}

export const CONTRACT_TEMPLATE = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SOFTWARE
Aurohub — Plataforma de Gestão de Conteúdo para Agências de Viagem
Contrato nº {{contract_number}}

════════════════════════════════════════════════════════════════

CONTRATANTE

Razão Social: {{company_name}}
CNPJ: {{company_cnpj}}
Endereço: {{company_address}}
Responsável: {{contact_name}}
E-mail: {{user_email}}

CONTRATADA

AuroVista Tecnologia Ltda.
CNPJ: 00.000.000/0001-00
São José do Rio Preto — SP
E-mail: comercial@aurovista.com.br

════════════════════════════════════════════════════════════════

CLÁUSULA 1 — OBJETO

1.1. O presente contrato tem por objeto a prestação de serviços de acesso
à plataforma Aurohub, sistema SaaS (Software as a Service) voltado à criação,
edição e publicação de conteúdo visual para agências de viagem, conforme
descrito nas cláusulas seguintes.

1.2. O plano contratado é {{plan_name}}, compreendendo:
  • Número de lojas/unidades: {{stores_count}}
  • Número de usuários: {{users_count}}
  • Add-ons: {{addons_list}}

════════════════════════════════════════════════════════════════

CLÁUSULA 2 — PRAZO

2.1. O contrato vigorará por {{contract_duration}} ({{contract_duration}} meses), com início
em {{start_date}} e término em {{end_date}}.

2.2. Findo o prazo, o contrato será renovado automaticamente por igual período,
salvo comunicação expressa de rescisão com antecedência mínima de 30 dias.

════════════════════════════════════════════════════════════════

CLÁUSULA 3 — VALORES E PAGAMENTO

3.1. O valor mensal do serviço é de {{monthly_value}}.

3.2. O valor total estimado do contrato ({{contract_duration}} meses) é de {{monthly_total}}.

3.3. A taxa de implantação (setup) é de {{setup_fee}}, cobrada uma única vez na
assinatura do contrato.

3.4. O pagamento será realizado via {{payment_method}}, com vencimento
todo dia {{payment_day}} de cada mês.

3.5. O atraso no pagamento acarretará multa de 2% sobre o valor em atraso,
acrescida de juros de 1% ao mês, calculados pro rata die.

════════════════════════════════════════════════════════════════

CLÁUSULA 4 — OBRIGAÇÕES DA CONTRATADA

4.1. Disponibilizar o acesso à plataforma Aurohub 24 horas por dia, 7 dias
por semana, com disponibilidade mínima de 99% mensal, exceto em janelas
de manutenção previamente comunicadas.

4.2. Garantir a segurança e confidencialidade dos dados da CONTRATANTE,
em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).

4.3. Fornecer suporte técnico via chat e e-mail em dias úteis, das 8h às 18h.

4.4. Notificar a CONTRATANTE com antecedência mínima de 15 dias sobre
alterações relevantes na plataforma.

════════════════════════════════════════════════════════════════

CLÁUSULA 4A — SERVIÇOS DE DESIGN

Os serviços de criação e alteração de artes visuais
não estão inclusos na mensalidade, exceto:

a) Templates padrão disponíveis na plataforma;
b) Campanhas institucionais da marca poderão ser
   disponibilizadas sem custo adicional ao Contratante,
   a critério exclusivo da Contratada.

Serviços de design sob demanda:
- Alteração de arte existente: sujeito a orçamento,
  valor mínimo de {{design_arte_alteracao}};
- Criação de arte nova (1 formato): {{design_arte_nova}};
- Pack completo (Stories + Feed + Reels): {{design_pack_completo}};
- Pack completo + TV: {{design_pack_tv}}.

Os valores acima são válidos na data de assinatura
deste contrato e podem ser reajustados mediante
comunicação prévia de 30 dias.

════════════════════════════════════════════════════════════════

CLÁUSULA 5 — OBRIGAÇÕES DA CONTRATANTE

5.1. Manter seus dados cadastrais atualizados no sistema.

5.2. Utilizar a plataforma exclusivamente para fins lícitos e em conformidade
com os Termos de Uso da Aurohub.

5.3. Não compartilhar credenciais de acesso com terceiros não autorizados.

5.4. Efetuar os pagamentos nos prazos estabelecidos.

════════════════════════════════════════════════════════════════

CLÁUSULA 6 — PROPRIEDADE INTELECTUAL

6.1. Todo o código-fonte, banco de dados, templates e conteúdos criados
pela CONTRATADA são de sua propriedade exclusiva.

6.2. Os conteúdos criados pela CONTRATANTE dentro da plataforma pertencem
à CONTRATANTE.

════════════════════════════════════════════════════════════════

CLÁUSULA 7 — RESCISÃO

7.1. O contrato poderá ser rescindido:
  a) Por qualquer das partes, mediante aviso prévio de 30 dias;
  b) Imediatamente, em caso de descumprimento grave de qualquer cláusula;
  c) Por inadimplência superior a 30 dias.

7.2. Em caso de rescisão antecipada pela CONTRATANTE sem justa causa,
será devida multa proporcional ao período restante, limitada a 3 mensalidades.

════════════════════════════════════════════════════════════════

CLÁUSULA 8 — LIMITAÇÃO DE RESPONSABILIDADE

8.1. A CONTRATADA não se responsabiliza por danos indiretos, lucros cessantes
ou perda de dados decorrentes de uso inadequado da plataforma.

8.2. A responsabilidade total da CONTRATADA limita-se ao valor pago nos
últimos 3 meses de contrato.

════════════════════════════════════════════════════════════════

CLÁUSULA 9 — FORO

9.1. As partes elegem o Foro da Comarca de São José do Rio Preto — SP para
dirimir quaisquer litígios decorrentes deste contrato, com renúncia a qualquer
outro, por mais privilegiado que seja.

════════════════════════════════════════════════════════════════

ASSINATURA ELETRÔNICA

Ao clicar em "Li e aceito os termos", o(a) CONTRATANTE confirma ter lido
e concordado com todas as cláusulas deste contrato, constituindo assinatura
eletrônica com validade jurídica nos termos da Medida Provisória 2.200-2/2001
e da Lei 14.063/2020.

Contrato nº: {{contract_number}}
Versão do documento: {{document_version}}
Data de início de vigência: {{start_date}}

════════════════════════════════════════════════════════════════
`;
