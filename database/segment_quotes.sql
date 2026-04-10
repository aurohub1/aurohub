-- ============================================================
-- Aurohub — Frases motivacionais por segmento
-- Rodar no Supabase SQL editor (ADM precisa de service_role)
-- ============================================================

-- 1. Coluna quotes (jsonb array). icon já existe.
alter table public.segments
  add column if not exists quotes jsonb not null default '[]'::jsonb;

-- 2. Popular frases por segmento (matching por name)
update public.segments
set quotes = '[
  "Beleza que se vende se constrói com presença.",
  "Cada arte é um reflexo do seu talento.",
  "Transforme seguidores em clientes fiéis."
]'::jsonb
where name = 'Beleza';

update public.segments
set quotes = '[
  "Conhecimento que inspira começa com visibilidade.",
  "Conteúdo que educa, engaja e converte.",
  "Sua instituição merece ser vista por quem busca crescer."
]'::jsonb
where name = 'Educação';

update public.segments
set quotes = '[
  "Cada imóvel tem a família certa esperando.",
  "Presença digital que aproxima pessoas de seus lares.",
  "Do post à chave: sua vitrine nunca fecha."
]'::jsonb
where name = 'Imobiliária';

update public.segments
set quotes = '[
  "Sua vitrine digital, aberta 24 horas.",
  "Estilo que se vende começa com uma boa arte.",
  "Moda que aparece, moda que vende."
]'::jsonb
where name = 'Moda';

update public.segments
set quotes = '[
  "Visibilidade inteligente para negócios que crescem.",
  "Presença digital que gera resultados reais.",
  "Conteúdo certo, cliente certo, hora certa."
]'::jsonb
where name = 'Outros';

update public.segments
set quotes = '[
  "Desperte o apetite antes mesmo da primeira garfada.",
  "Cada prato merece uma apresentação à altura.",
  "Do post à mesa: sua melhor reserva começa online."
]'::jsonb
where name = 'Restaurante';

update public.segments
set quotes = '[
  "Cuidado que se comunica gera confiança.",
  "Sua clínica presente onde seus pacientes estão.",
  "Saúde que se vê é saúde que se busca."
]'::jsonb
where name = 'Saúde';

update public.segments
set quotes = '[
  "Transforme destinos em decisões.",
  "Conteúdo que converte curiosidade em reserva.",
  "Do post à passagem: sua jornada começa aqui.",
  "Presença digital que gera embarques.",
  "Cada arte é um convite a descobrir o mundo."
]'::jsonb
where name = 'Turismo';

-- 3. Verificar resultado
select name, icon, jsonb_array_length(quotes) as qtd_frases
from public.segments
order by name;
