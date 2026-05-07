import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://emcafedppvwparimvtob.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM"
);

const items = [
  // PLANOS E CONTRATO
  { category: "Planos e Contrato", title: "O que está incluído em cada plano?", content: "Essencial: 2 perfis, 5 stories/mês, suporte básico. Pro: 5 perfis, 10 stories, métricas e agenda. Business: 3 perfis, 20 posts, 15 stories, IA, agenda e métricas avançadas. Todos incluem acesso à plataforma e templates profissionais." },
  { category: "Planos e Contrato", title: "Qual é o período mínimo de fidelidade?", content: "Essencial e Pro: 6 meses. Business: 12 meses." },
  { category: "Planos e Contrato", title: "Posso cancelar antes do período mínimo?", content: "O cancelamento antecipado está sujeito às condições do contrato assinado na adesão." },
  { category: "Planos e Contrato", title: "Como funciona a taxa de implantação?", content: "Cobrada uma única vez na contratação. Cobre configuração da plataforma, criação dos perfis, personalização dos templates e treinamento da equipe." },
  { category: "Planos e Contrato", title: "Posso mudar de plano depois?", content: "Sim, entre em contato com o suporte para upgrade ou downgrade. O valor é ajustado proporcionalmente." },
  { category: "Planos e Contrato", title: "O que são add-ons?", content: "Recursos extras contratados além do plano base: TV (R$49), IA (R$120), Agenda (R$99), Métricas (R$79), Card WhatsApp (R$49), Usuários adicionais (R$29), Transmissão Individual (R$29), Time (R$199), Rede (R$449)." },
  { category: "Planos e Contrato", title: "Existe plano para redes com muitas lojas?", content: "Sim. O plano Business foi criado para redes com 6 ou mais lojas. Para redes muito grandes, consulte o suporte para proposta personalizada." },

  // PUBLICAÇÃO E TEMPLATES
  { category: "Publicação e Templates", title: "Como publico uma arte no Instagram?", content: "Acesse Publicar no menu, preencha os dados, escolha o template e clique em publicar. A arte é gerada automaticamente e enviada ao Instagram." },
  { category: "Publicação e Templates", title: "Quais tipos de arte posso publicar?", content: "Pacotes, cruzeiros, Card WhatsApp, Stories 9:16 e posts de feed." },
  { category: "Publicação e Templates", title: "Posso agendar publicações?", content: "Sim. Na Central de Publicação é possível agendar posts para datas e horários específicos." },
  { category: "Publicação e Templates", title: "Quantos posts posso publicar por mês?", content: "Depende do plano contratado. Consulte seus limites em Configurações ou na Calculadora." },
  { category: "Publicação e Templates", title: "O que acontece quando atinjo o limite de posts?", content: "Você recebe uma notificação quando estiver próximo do limite. Novas publicações ficam bloqueadas até o próximo ciclo ou até contratar mais posts." },
  { category: "Publicação e Templates", title: "Posso publicar para mais de uma loja?", content: "Sim, desde que seu plano inclua múltiplos perfis. Cada loja tem seu próprio perfil do Instagram conectado." },
  { category: "Publicação e Templates", title: "Os templates são personalizados com a minha marca?", content: "Sim. O time Aurovista configura os templates com cores, fontes e identidade visual da sua agência antes da entrega." },
  { category: "Publicação e Templates", title: "A arte gerada tem marca d'água?", content: "Não. As artes são 100% da sua agência, sem marca d'água da Aurovista." },
  { category: "Publicação e Templates", title: "Que formato de imagem é gerado?", content: "PNG em alta resolução (1080x1920 para Stories, 1080x1080 para feed)." },
  { category: "Publicação e Templates", title: "O que é o Card WhatsApp?", content: "Arte com múltiplos destinos e preços em um único card, ideal para enviar no WhatsApp. Disponível como add-on em qualquer plano." },
  { category: "Publicação e Templates", title: "Posso usar músicas nas publicações?", content: "Sim, se o add-on de música estiver ativo. O banco de músicas é acessado diretamente no formulário de publicação." },

  // DESTINOS E CONTEÚDO
  { category: "Destinos e Conteúdo", title: "Que tipos de viagem posso publicar?", content: "Pacotes nacionais e internacionais, cruzeiros, passagens aéreas, hospedagens e promoções especiais." },
  { category: "Destinos e Conteúdo", title: "Como funciona o campo de destino?", content: "O destino é sempre exibido em MAIÚSCULAS automaticamente." },
  { category: "Destinos e Conteúdo", title: "Posso publicar cruzeiro com itinerário?", content: "Sim. O formulário tem campo específico para itinerário no formato Santos / Navegação / Búzios / Navegação / Santos." },
  { category: "Destinos e Conteúdo", title: "Como funciona o campo de serviços inclusos?", content: "Você digita cada serviço incluído e eles aparecem como lista na arte automaticamente." },
  { category: "Destinos e Conteúdo", title: "Posso mostrar desconto na arte?", content: "Sim. Existe badge de desconto que exibe o percentual em destaque na arte." },
  { category: "Destinos e Conteúdo", title: "Como funciona o campo de parcelamento?", content: "Informe o número de parcelas e o valor. A plataforma formata automaticamente com o número grande e centavos menores." },
  { category: "Destinos e Conteúdo", title: "Como informo o tipo de acomodação?", content: "No formulário selecione entre Hotel, Pousada, Resort, Apart-hotel, Flat, Chalé, Hostel, Fazenda ou Lodge." },

  // INSTAGRAM E INTEGRAÇÕES
  { category: "Instagram e Integrações", title: "Preciso conectar minha conta do Instagram?", content: "Sim. A conexão é feita via token de acesso durante a implantação pelo suporte Aurovista." },
  { category: "Instagram e Integrações", title: "Meu token do Instagram expira?", content: "Não. Os tokens utilizados na plataforma são permanentes." },
  { category: "Instagram e Integrações", title: "A plataforma publica Stories e Reels?", content: "Sim, suporta Stories 9:16 e posts no feed." },
  { category: "Instagram e Integrações", title: "Posso conectar mais de uma conta do Instagram?", content: "Sim, uma conta por loja/perfil contratado." },
  { category: "Instagram e Integrações", title: "A plataforma usa a API oficial do Instagram?", content: "Sim. Todas as publicações passam pela API oficial do Instagram Graph." },
  { category: "Instagram e Integrações", title: "Posso ver métricas do Instagram dentro da plataforma?", content: "Sim, com o add-on Métricas ativo. Seguidores, impressões, alcance e engajamento por loja." },
  { category: "Instagram e Integrações", title: "A plataforma integra com Mercado Pago?", content: "Sim, para gestão de pagamentos e assinaturas." },

  // USUÁRIOS E ACESSOS
  { category: "Usuários e Acessos", title: "Quais são os tipos de usuário?", content: "5 níveis: ADM Aurovista, Cliente, Gerente, Unidade e Consultor. Cada nível tem permissões específicas." },
  { category: "Usuários e Acessos", title: "Quem pode publicar?", content: "Gerente e Unidade por padrão. O Cliente pode liberar acesso ao Consultor." },
  { category: "Usuários e Acessos", title: "Como adiciono um novo usuário?", content: "Acesse Configurações → Usuários → Novo usuário. Preencha nome, e-mail e nível de acesso." },
  { category: "Usuários e Acessos", title: "Como removo um usuário?", content: "Acesse Configurações → Usuários, localize e desative ou exclua o acesso." },
  { category: "Usuários e Acessos", title: "Um gerente pode publicar por todas as lojas?", content: "Sim. O gerente tem permissão de publicação para todas as lojas do seu cliente." },
  { category: "Usuários e Acessos", title: "Posso bloquear um usuário temporariamente?", content: "Sim. Desative o acesso sem excluir. Pode ser reativado quando necessário." },

  // DATAS E AGENDA
  { category: "Datas e Agenda", title: "Como funciona o calendário de datas comemorativas?", content: "O ADM cadastra datas importantes que aparecem como sugestões no calendário de publicação da equipe." },
  { category: "Datas e Agenda", title: "Posso programar publicações com antecedência?", content: "Sim, pela Central de Publicação você agenda posts para qualquer data e hora futura." },
  { category: "Datas e Agenda", title: "A plataforma me avisa sobre datas importantes?", content: "Sim. Notificações são enviadas quando se aproximam datas comemorativas cadastradas." },
  { category: "Datas e Agenda", title: "Como funciona a data de ida e volta?", content: "Data de ida deve ser maior ou igual à data atual. Volta maior ou igual à ida. Número de noites calculado automaticamente." },

  // MÉTRICAS E RELATÓRIOS
  { category: "Métricas e Relatórios", title: "Quais métricas estão disponíveis?", content: "Com o add-on Métricas: seguidores, impressões, alcance e engajamento por loja com gráficos por período." },
  { category: "Métricas e Relatórios", title: "Posso comparar desempenho entre lojas?", content: "Sim. O gerente tem visão consolidada de todas as lojas." },
  { category: "Métricas e Relatórios", title: "Com que frequência as métricas são atualizadas?", content: "Diariamente via API oficial do Instagram." },
  { category: "Métricas e Relatórios", title: "Posso exportar relatórios?", content: "Funcionalidade em desenvolvimento. Em breve disponível em PDF ou Excel." },

  // SEGURANÇA E PRIVACIDADE
  { category: "Segurança e Privacidade", title: "Meus dados estão seguros?", content: "Sim. A plataforma usa Supabase com criptografia, políticas de acesso por linha e autenticação segura." },
  { category: "Segurança e Privacidade", title: "A Aurovista vende meus dados?", content: "Não. Seus dados são usados exclusivamente para operação da plataforma." },
  { category: "Segurança e Privacidade", title: "Posso solicitar exclusão dos meus dados?", content: "Sim. Entre em contato com o suporte para exclusão completa conforme a LGPD." },
  { category: "Segurança e Privacidade", title: "A plataforma está em conformidade com a LGPD?", content: "Sim." },

  // CONFIGURAÇÕES E PERSONALIZAÇÃO
  { category: "Configurações e Personalização", title: "Posso personalizar as cores da plataforma?", content: "O ADM configura identidade visual por cliente com cores primárias, secundárias e gradientes." },
  { category: "Configurações e Personalização", title: "Como configuro a splash screen?", content: "O ADM escolhe entre 16 efeitos de splash e pode configurar música de fundo para a tela de login." },
  { category: "Configurações e Personalização", title: "O que é o Vault?", content: "Cofre seguro de tokens e chaves de API. Somente o ADM Aurovista tem acesso." },
  { category: "Configurações e Personalização", title: "Como funciona a tela de manutenção?", content: "O ADM ativa o modo manutenção com mensagem personalizada. Todos os usuários veem a tela até o sistema ser reativado." },

  // PWA E ACESSO MOBILE
  { category: "PWA e Acesso Mobile", title: "O que é o PWA do Aurohub?", content: "Permite instalar a plataforma no celular como aplicativo nativo sem precisar da App Store." },
  { category: "PWA e Acesso Mobile", title: "Como instalo no iPhone?", content: "Safari → acesse a plataforma → compartilhar → Adicionar à Tela de Início." },
  { category: "PWA e Acesso Mobile", title: "Como instalo no Android?", content: "Chrome → acesse a plataforma → Instalar app ou Adicionar à tela inicial." },
  { category: "PWA e Acesso Mobile", title: "O app funciona offline?", content: "Funcionalidades básicas ficam disponíveis offline. Publicações exigem conexão." },

  // NOTIFICAÇÕES
  { category: "Notificações", title: "Como ativo as notificações push?", content: "Ao entrar na plataforma clique em Ativar no aviso que aparece." },
  { category: "Notificações", title: "Para que servem as notificações?", content: "Aviso de post publicado, falha de publicação e proximidade do limite do plano." },
  { category: "Notificações", title: "Como desativo as notificações?", content: "Configurações do navegador → Notificações → Aurovista → Bloquear." },

  // PAGAMENTO E FATURA
  { category: "Pagamento e Fatura", title: "Quais formas de pagamento são aceitas?", content: "Cartão de crédito, boleto bancário e débito via Mercado Pago." },
  { category: "Pagamento e Fatura", title: "Quando sou cobrado?", content: "Mensalmente na data de vencimento definida no contrato." },
  { category: "Pagamento e Fatura", title: "O que acontece se o pagamento atrasar?", content: "O acesso fica suspenso após o vencimento. Entre em contato com o suporte para negociação." },

  // SUPORTE E MANUTENÇÃO
  { category: "Suporte e Manutenção", title: "Como entro em contato com o suporte?", content: "Pelo botão flutuante dentro da plataforma ou pelo e-mail contato@aurovista.com.br." },
  { category: "Suporte e Manutenção", title: "Qual o horário de atendimento?", content: "Segunda a sexta, das 9h às 18h (horário de Brasília)." },
  { category: "Suporte e Manutenção", title: "Como reporto um bug?", content: "Use o botão de suporte e descreva o problema com prints. Respondemos em até 24h úteis." },
  { category: "Suporte e Manutenção", title: "A plataforma tem backup?", content: "Sim. Dados armazenados no Supabase com backup automático diário." },

  // DÚVIDAS GERAIS
  { category: "Dúvidas Gerais", title: "A plataforma tem período de teste gratuito?", content: "Consulte o suporte para condições especiais de demonstração." },
  { category: "Dúvidas Gerais", title: "Como fico sabendo das novidades?", content: "Atualizações são comunicadas por e-mail e notificações dentro da plataforma." },
  { category: "Dúvidas Gerais", title: "Existe treinamento para minha equipe?", content: "Sim. O onboarding inclui treinamento. Sessões adicionais podem ser contratadas." },
  { category: "Dúvidas Gerais", title: "Posso usar em vários computadores?", content: "Sim. Funciona em qualquer navegador moderno em quantos dispositivos quiser." },
];

const payload = items.map((item) => ({
  title: item.title,
  category: item.category,
  content: item.content,
  tags: item.category.toLowerCase().replace(/ e /g, ",").replace(/ /g, "-"),
  status: "published",
  views: 0,
}));

const { data, error } = await supabase.from("faq_articles").insert(payload).select("id");

if (error) {
  console.error("Erro:", error.message);
  process.exit(1);
}

console.log(`✓ ${data.length} artigos de FAQ inseridos com sucesso.`);
