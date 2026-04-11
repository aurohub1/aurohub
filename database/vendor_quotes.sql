-- ============================================================
-- vendor_quotes — 15 frases motivacionais de venda por segmento
-- Usado no dashboard do vendedor (/vendedor/inicio)
-- Rodar no Supabase SQL editor (precisa service_role)
-- ============================================================

-- 1. Nova coluna (coexiste com `quotes`, que é usada pelo dashboard do cliente)
alter table public.segments
  add column if not exists vendor_quotes jsonb not null default '[]'::jsonb;

-- 2. Popular frases por segmento (match por name)

update public.segments
set vendor_quotes = '[
  "Cada pacote é uma história esperando para ser vivida.",
  "Vender viagem é vender emoção antes mesmo do embarque.",
  "Quem conhece o destino inspira confiança — e confiança fecha venda.",
  "O melhor roteiro começa com uma boa conversa.",
  "Um destino bem apresentado se vende sozinho.",
  "Cada cliente satisfeito é um novo destino descoberto.",
  "Transforme o sonho do cliente em reserva confirmada.",
  "Quem viaja uma vez quer viajar sempre — seja o agente que ele vai lembrar.",
  "Detalhes fazem a diferença entre uma venda e uma experiência inesquecível.",
  "O cliente não compra passagem — compra memória.",
  "Cada objeção é uma pergunta disfarçada. Responda com confiança.",
  "Conheça os destinos que você vende como se já tivesse estado lá.",
  "A melhor propaganda é o cliente que volta sorrindo.",
  "Persistência é o passaporte para as melhores vendas.",
  "Quem planta relacionamento colhe embarques."
]'::jsonb
where name = 'Turismo';

update public.segments
set vendor_quotes = '[
  "Beleza que se vende começa com quem acredita no que oferece.",
  "Cada cliente que sai satisfeito volta e traz mais dois.",
  "Sua dedicação é o melhor produto que você tem.",
  "Confiança se constrói atendimento por atendimento.",
  "Quem cuida bem vende sem esforço.",
  "O sorriso do cliente é o seu melhor resultado.",
  "Beleza é autoestima — você vende muito mais que um serviço.",
  "Ambiente, atendimento e técnica: os três pilares de quem fideliza.",
  "Cada detalhe importa quando o cliente é o centro.",
  "Quem evolui constantemente sempre tem clientes novos.",
  "A fidelização começa no primeiro contato.",
  "Seja a referência que seu cliente indica para todo mundo.",
  "Cuidar do cliente é cuidar do seu negócio.",
  "Excelência não é perfeição — é consistência.",
  "Faça cada atendimento como se fosse o mais importante do dia."
]'::jsonb
where name = 'Beleza';

update public.segments
set vendor_quotes = '[
  "Cada matrícula é uma vida transformada.",
  "Vender educação é plantar o futuro de alguém.",
  "Conhecimento que inspira se vende naturalmente.",
  "Seu entusiasmo pelo produto é o melhor argumento de venda.",
  "Quem acredita no que ensina convence sem precisar convencer.",
  "Educação é o investimento que nunca perde valor — lembre o cliente disso.",
  "Cada dúvida respondida com clareza aproxima a matrícula.",
  "O aluno satisfeito é o melhor vendedor que você tem.",
  "Mostre impacto real — números e histórias vendem mais que promessas.",
  "Persistência no follow-up é respeito pelo futuro do cliente.",
  "Quem estuda o produto conhece a resposta para cada objeção.",
  "Transformação começa com uma decisão — ajude seu cliente a tomar a certa.",
  "Vender educação exige paixão pelo que você representa.",
  "O melhor pitch é uma história de quem já transformou a vida estudando.",
  "Seja consultor antes de ser vendedor."
]'::jsonb
where name = 'Educação';

update public.segments
set vendor_quotes = '[
  "Cada imóvel carrega o sonho de uma família.",
  "Vender bem começa por ouvir o que o cliente realmente quer.",
  "Um bom corretor não vende imóveis — realiza sonhos.",
  "Persistência é o maior diferencial de quem vende imóveis.",
  "Conheça cada detalhe do imóvel — seu cliente vai perceber.",
  "O imóvel certo para o cliente certo — sua missão é conectar os dois.",
  "Confiança se constrói visita por visita.",
  "Quem conhece o mercado tem argumento para qualquer objeção.",
  "Cada não é um filtro que te aproxima do cliente certo.",
  "O mercado imobiliário recompensa quem é consistente.",
  "Relacionamento é o ativo mais valioso de um corretor.",
  "Seja o corretor que o cliente liga antes de procurar na internet.",
  "Cada entrega de chave é o resultado de muito trabalho bem feito.",
  "Ouça mais, fale menos — o cliente te diz o que precisa para fechar.",
  "Quem cuida do pós-venda nunca falta indicações."
]'::jsonb
where name = 'Imobiliária';

update public.segments
set vendor_quotes = '[
  "Estilo que se vende começa com quem apresenta com confiança.",
  "Cada peça tem o cliente certo — sua missão é conectar os dois.",
  "Moda que aparece, moda que vende.",
  "Sua vitrine começa no seu atendimento.",
  "Quem veste bem o cliente cria um fã, não um comprador.",
  "Moda é expressão — ajude seu cliente a se expressar.",
  "Conheça o estilo do cliente antes de mostrar o produto.",
  "Tendência que combina com o cliente é tendência que vende.",
  "Cada sugestão certa fortalece a confiança do cliente em você.",
  "Visual merchandising começa no seu entusiasmo pela peça.",
  "O cliente que se olha no espelho e gosta sempre volta.",
  "Atendimento personalizado é o luxo que toda loja pode oferecer.",
  "Quem conhece o produto encontra a combinação perfeita para cada cliente.",
  "Moda muda — relacionamento com o cliente é permanente.",
  "Seja o consultor de estilo que seu cliente não sabia que precisava."
]'::jsonb
where name = 'Moda';

update public.segments
set vendor_quotes = '[
  "Cada prato merece ser apresentado com orgulho.",
  "A experiência começa antes da primeira garfada.",
  "Hospitalidade é o tempero que nenhuma receita ensina.",
  "Clientes satisfeitos são o melhor cardápio do dia.",
  "Servir bem é a arte por trás de cada venda.",
  "O cliente que se sente bem-vindo sempre volta.",
  "Cada detalhe do atendimento compõe a experiência final.",
  "Conheça o cardápio como um sommelier conhece os vinhos.",
  "Uma boa recomendação vale mais que qualquer promoção.",
  "Agilidade e simpatia são o prato mais pedido.",
  "O cliente satisfeito é o chef que divulga de graça.",
  "Cada mesa é uma oportunidade de criar um cliente fiel.",
  "Quem antecipa a necessidade do cliente entrega mais que comida — entrega cuidado.",
  "O sorriso no atendimento tem mais sabor que qualquer tempero.",
  "Faça cada visita parecer a primeira — e a mais especial."
]'::jsonb
where name = 'Restaurante';

update public.segments
set vendor_quotes = '[
  "Cada consulta agendada é um passo em direção ao bem-estar.",
  "Cuidar de quem cuida começa com um bom atendimento.",
  "Confiança é o remédio que nenhuma farmácia vende.",
  "Quem atende com empatia fideliza para sempre.",
  "Saúde que se comunica bem gera pacientes que voltam.",
  "Cada paciente bem atendido é uma indicação em potencial.",
  "Acolhimento é a primeira etapa de qualquer tratamento.",
  "Clareza nas informações reduz a ansiedade e aumenta a confiança.",
  "Quem cuida do relacionamento cuida também dos resultados.",
  "Presença e atenção valem mais que qualquer protocolo.",
  "O paciente que se sente ouvido já começa a se curar.",
  "Excelência no atendimento é a melhor medicina preventiva.",
  "Cada retorno é prova de que o cuidado foi genuíno.",
  "Saúde é prioridade — ajude seu paciente a lembrar disso.",
  "Quem humaniza o atendimento transforma paciente em parceiro."
]'::jsonb
where name = 'Saúde';

update public.segments
set vendor_quotes = '[
  "Cada cliente é uma oportunidade única de fazer a diferença.",
  "Consistência é o segredo de quem vende todo dia.",
  "Seu melhor dia de vendas começa com a primeira ligação.",
  "Atendimento excelente é o produto mais difícil de copiar.",
  "Quem não desiste hoje fecha amanhã.",
  "O cliente compra de quem ele confia — construa isso todos os dias.",
  "Cada objeção superada é uma venda mais perto.",
  "Quem conhece bem o produto encontra o argumento certo na hora certa.",
  "Resultado é consequência de processo — confie no seu.",
  "A melhor venda é a que resolve um problema real do cliente.",
  "Relacionamento é o ativo que nenhuma crise apaga.",
  "Foco no cliente sempre supera foco na meta.",
  "Quem aprende com cada não se torna imbatível.",
  "Pequenas ações consistentes geram grandes resultados.",
  "Seu próximo recorde começa com a próxima ligação."
]'::jsonb
where name = 'Outros';

-- 3. Verificar resultado
select name, icon,
       jsonb_array_length(quotes)        as cliente_frases,
       jsonb_array_length(vendor_quotes) as vendor_frases
from public.segments
order by name;
