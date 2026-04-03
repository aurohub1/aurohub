// ===== HIERARQUIA: ADM raiz → Marca/Licenciado → Loja → Funcionário =====

export type TipoUsuario = "adm" | "licenciado" | "loja" | "cliente";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  tipo: TipoUsuario;
  marca_id: string | null;
  loja_id: string | null;
  ativo: boolean;
  plano: string | null;
  created_at: string;
  updated_at: string;
}

export interface Marca {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  created_at: string;
}

export interface Loja {
  id: string;
  marca_id: string;
  nome: string;
  cidade: string;
  ig_user_id: string | null;
  ig_access_token: string | null;
  ativa: boolean;
  created_at: string;
}

export interface Template {
  id: string;
  marca_id: string | null;
  nome: string;
  tipo_form: "pacote" | "campanha" | "cruzeiro" | "anoiteceu";
  formato: "stories" | "feed" | "reels" | "transmissao";
  largura: number;
  altura: number;
  schema_json: string;
  thumbnail_url: string | null;
  ativo: boolean;
  permite_postagem: boolean;
  apenas_download: boolean;
  created_at: string;
}

export interface Postagem {
  id: string;
  usuario_id: string;
  loja_id: string;
  template_id: string;
  imagem_url: string;
  legenda: string;
  formato: string;
  ig_media_id: string | null;
  status: "rascunho" | "agendado" | "publicado" | "erro";
  agendado_para: string | null;
  publicado_em: string | null;
  created_at: string;
}

export interface Plano {
  id: string;
  nome: string;
  slug: string;
  preco_mensal: number;
  preco_anual: number;
  limite_lojas: number;
  limite_usuarios: number;
  limite_posts: number; // Feed=1pt, Reels=2pts
  limite_stories: number;
  inclui_transmissao: boolean;
  inclui_agendamento: boolean;
  ativo: boolean;
}

export interface Pack {
  id: string;
  usuario_id: string;
  tipo: "pack10" | "pack30" | "pack60";
  creditos_total: number;
  creditos_usados: number;
  validade: string; // 90 dias
  ativo: boolean;
  created_at: string;
}

export interface LogAtividade {
  id: string;
  usuario_id: string;
  loja_id: string;
  acao: string;
  formato: string;
  detalhes: Record<string, unknown>;
  created_at: string;
}
