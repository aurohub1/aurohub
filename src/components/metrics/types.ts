export type Formato = "stories" | "reels" | "feed" | "tv";
export type Tipo = "publicado" | "download";

export interface PublicationRow {
  id: string;
  licensee_id: string;
  loja_id: string | null;
  user_id: string | null;
  user_role: string | null;
  template_id: string;
  template_nome: string | null;
  formato: Formato;
  tipo: Tipo;
  destino: string | null;
  created_at: string;
}

export const FORMATO_LABEL: Record<Formato, string> = {
  stories: "Stories",
  reels:   "Reels",
  feed:    "Feed",
  tv:      "TV",
};

export const FORMATO_COLOR: Record<Formato, string> = {
  stories: "#3B82F6",
  reels:   "#8B5CF6",
  feed:    "#F59E0B",
  tv:      "#10B981",
};

export const TIPO_COLOR: Record<Tipo, string> = {
  publicado: "#3B82F6",
  download:  "#D4A843",
};

export type PeriodoDias = 7 | 30 | 90;
export const PERIODO_LABEL: Record<PeriodoDias, string> = {
  7:  "7 dias",
  30: "30 dias",
  90: "90 dias",
};
