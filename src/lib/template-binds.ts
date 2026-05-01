/**
 * Binds disponíveis por tipo de formulário
 * Usado no editor V2 e no PreviewStage para resolver valores
 */

export interface BindDefinition {
  id: string;
  label: string;
  type: 'text' | 'image';
}

export interface BindCategory {
  [category: string]: BindDefinition[];
}

export const BINDS_POR_FORM: Record<string, BindCategory> = {
  pacote: {
    Imagens: [
      { id: 'imgfundo', label: 'Imagem de Fundo', type: 'image' },
      { id: 'imghotel', label: 'Imagem do Hotel', type: 'image' },
      { id: 'imgloja', label: 'Logo da Loja', type: 'image' },
    ],
    Destino: [
      { id: 'destino', label: 'Destino / Resort', type: 'text' },
      { id: 'saida', label: 'Saída', type: 'text' },
      { id: 'voo', label: 'Tipo de Voo', type: 'text' },
      { id: 'periodo', label: 'Período', type: 'text' },
      { id: 'noites', label: 'Noites', type: 'text' },
      { id: 'hotel', label: 'Hotel', type: 'text' },
      { id: 'incluso', label: 'Incluso', type: 'text' },
      { id: 'servico1', label: 'Serviço 1', type: 'text' },
      { id: 'servico2', label: 'Serviço 2', type: 'text' },
      { id: 'servico3', label: 'Serviço 3', type: 'text' },
      { id: 'servico4', label: 'Serviço 4', type: 'text' },
      { id: 'servico5', label: 'Serviço 5', type: 'text' },
      { id: 'servico6', label: 'Serviço 6', type: 'text' },
      { id: 'servicos', label: 'Serviços (lista completa, 1 por linha)', type: 'text' },
      { id: 'servicos_lista', label: 'Serviços (lista completa)', type: 'text' },
      { id: 'texto', label: 'Texto Livre', type: 'text' },
    ],
    Valor: [
      { id: 'formapagamento', label: 'Forma de Pagamento', type: 'text' },
      { id: 'parcelas', label: 'Parcelas', type: 'text' },
      { id: 'valorparcela', label: 'Valor da Parcela', type: 'text' },
      { id: 'valortotal', label: 'Valor Total', type: 'text' },
      { id: 'entrada', label: 'Entrada', type: 'text' },
    ],
    Loja: [
      { id: 'loja', label: 'Nome da Loja', type: 'text' },
    ],
    Badges: [
      { id: 'desconto', label: 'Desconto (%)', type: 'text' },
      { id: 'badge_oferta', label: 'Oferta Azul', type: 'image' },
      { id: 'badge_ultima_chamada', label: 'Última Chamada', type: 'image' },
      { id: 'badge_ultimos_lugares', label: 'Últimos Lugares', type: 'image' },
      { id: 'badge_all_inclusive', label: 'All Inclusive', type: 'image' },
      { id: 'badge_feriado', label: 'Badge Feriado', type: 'image' },
    ],
  },

  campanha: {
    Imagens: [
      { id: 'imgfundo', label: 'Imagem de Fundo', type: 'image' },
      { id: 'imgloja', label: 'Logo da Loja', type: 'image' },
    ],
    Destino: [
      { id: 'destino', label: 'Destino', type: 'text' },
      { id: 'saida', label: 'Saída', type: 'text' },
      { id: 'voo', label: 'Tipo de Voo', type: 'text' },
      { id: 'periodo', label: 'Período', type: 'text' },
      { id: 'hotel', label: 'Hotel', type: 'text' },
      { id: 'incluso', label: 'Incluso', type: 'text' },
      { id: 'servico1', label: 'Serviço 1', type: 'text' },
      { id: 'servico2', label: 'Serviço 2', type: 'text' },
      { id: 'servico3', label: 'Serviço 3', type: 'text' },
      { id: 'servico4', label: 'Serviço 4', type: 'text' },
      { id: 'servico5', label: 'Serviço 5', type: 'text' },
      { id: 'servico6', label: 'Serviço 6', type: 'text' },
      { id: 'servicos', label: 'Serviços (lista completa, 1 por linha)', type: 'text' },
      { id: 'servicos_lista', label: 'Serviços (lista completa)', type: 'text' },
      { id: 'texto', label: 'Texto Livre', type: 'text' },
    ],
    Valor: [
      { id: 'formapagamento', label: 'Forma de Pagamento', type: 'text' },
      { id: 'parcelas', label: 'Parcelas', type: 'text' },
      { id: 'valorparcela', label: 'Valor da Parcela', type: 'text' },
      { id: 'valortotal', label: 'Valor Total', type: 'text' },
      { id: 'entrada', label: 'Entrada', type: 'text' },
    ],
    Loja: [
      { id: 'loja', label: 'Nome da Loja', type: 'text' },
    ],
    Badges: [
      { id: 'desconto', label: 'Desconto (%)', type: 'text' },
      { id: 'badge_oferta', label: 'Oferta Azul', type: 'image' },
      { id: 'badge_ultima_chamada', label: 'Última Chamada', type: 'image' },
      { id: 'badge_ultimos_lugares', label: 'Últimos Lugares', type: 'image' },
      { id: 'badge_all_inclusive', label: 'All Inclusive', type: 'image' },
      { id: 'badge_feriado', label: 'Badge Feriado', type: 'image' },
    ],
  },

  cruzeiro: {
    Imagens: [
      { id: 'imgfundo', label: 'Imagem de Fundo', type: 'image' },
      { id: 'logo_cia', label: 'Logo CIA Marítima', type: 'image' },
      { id: 'imgloja', label: 'Logo da Loja', type: 'image' },
    ],
    Navio: [
      { id: 'navio', label: 'Nome do Navio', type: 'text' },
      { id: 'destino', label: 'Destino', type: 'text' },
      { id: 'embarque', label: 'Porto de Embarque', type: 'text' },
      { id: 'itinerario', label: 'Itinerário', type: 'text' },
      { id: 'noites', label: 'Noites', type: 'text' },
      { id: 'cabine', label: 'Cabine', type: 'text' },
      { id: 'incluso', label: 'Incluso', type: 'text' },
    ],
    Datas: [
      { id: 'data_periodo', label: 'Período (23 a 28/03)', type: 'text' },
    ],
    Valor: [
      { id: 'forma_pgto', label: 'Forma de Pagamento', type: 'text' },
      { id: 'parcelas', label: 'Parcelas', type: 'text' },
      { id: 'valor_preco', label: 'Valor da Parcela', type: 'text' },
      { id: 'valor_total_texto', label: 'Valor Total (texto)', type: 'text' },
    ],
    Loja: [
      { id: 'nome_loja', label: 'Logo da Loja', type: 'image' },
      { id: 'loja', label: 'Nome da Loja', type: 'text' },
    ],
  },

  anoiteceu: {
    Imagens: [
      { id: 'imgfundo', label: 'Imagem Anoiteceu', type: 'image' },
      { id: 'imgloja', label: 'Logo da Loja', type: 'image' },
    ],
    'Conteúdo': [
      { id: 'numero', label: 'Número', type: 'text' },
      { id: 'titulo', label: 'Título', type: 'text' },
      { id: 'descricao', label: 'Descrição', type: 'text' },
    ],
    Datas: [
      { id: 'data_inicio', label: 'Data Início (dia e mês)', type: 'text' },
      { id: 'data_fim', label: 'Data Fim (dia e mês)', type: 'text' },
      { id: 'data_completa', label: 'Data Completa (dia/mês/ano)', type: 'text' },
      { id: 'para_viagens_ate', label: 'Para viagens até', type: 'text' },
    ],
    Loja: [
      { id: 'logo_loja', label: 'Logo Azul Viagens', type: 'image' },
      { id: 'loja', label: 'Nome da Loja', type: 'text' },
    ],
    Badges: [
      { id: 'desconto_anoit_valor', label: 'Desconto Anoiteceu (só número)', type: 'text' },
    ],
  },

  passagem: {
    Imagens: [
      { id: 'imgfundo', label: 'Imagem de Fundo', type: 'image' },
      { id: 'imgaviao', label: 'Imagem Avião (aleatória)', type: 'image' },
      { id: 'imgloja', label: 'Logo da Loja', type: 'image' },
    ],
    Destino: [
      { id: 'destino', label: 'Destino', type: 'text' },
      { id: 'saida', label: 'Saída', type: 'text' },
      { id: 'voo', label: 'Tipo de Voo', type: 'text' },
      { id: 'periodo', label: 'Período', type: 'text' },
      { id: 'texto', label: 'Texto Livre', type: 'text' },
    ],
    Valor: [
      { id: 'parcelas', label: 'Parcelas', type: 'text' },
      { id: 'valorparcela', label: 'Valor da Parcela', type: 'text' },
      { id: 'valortotal', label: 'Valor Total por Pessoa', type: 'text' },
    ],
    Loja: [
      { id: 'logo_loja', label: 'Logo Azul Viagens', type: 'image' },
      { id: 'loja', label: 'Nome da Loja', type: 'text' },
    ],
    Badges: [
      { id: 'desconto', label: 'Desconto (%)', type: 'text' },
      { id: 'badge_feriado', label: 'Badge Feriado', type: 'image' },
    ],
  },

  quatro_destinos: {
    Imagens: [
      { id: 'img_1', label: 'Imagem Destino 1', type: 'image' },
      { id: 'img_2', label: 'Imagem Destino 2', type: 'image' },
      { id: 'img_3', label: 'Imagem Destino 3', type: 'image' },
      { id: 'img_4', label: 'Imagem Destino 4', type: 'image' },
    ],
    Destinos: [
      { id: 'destino_1', label: 'Destino 1', type: 'text' },
      { id: 'destino_2', label: 'Destino 2', type: 'text' },
      { id: 'destino_3', label: 'Destino 3', type: 'text' },
      { id: 'destino_4', label: 'Destino 4', type: 'text' },
      { id: 'valor_1', label: 'Valor 1', type: 'text' },
      { id: 'valor_2', label: 'Valor 2', type: 'text' },
      { id: 'valor_3', label: 'Valor 3', type: 'text' },
      { id: 'valor_4', label: 'Valor 4', type: 'text' },
    ],
    Loja: [
      { id: 'logo_loja', label: 'Logo Azul Viagens', type: 'image' },
    ],
  },

  card_whatsapp: {
    Imagens: [
      { id: 'img_fundo', label: 'Imagem de Fundo', type: 'image' },
    ],
    Cabeçalho: [
      { id: 'lam_titulo1', label: 'Título 1', type: 'text' },
      { id: 'lam_titulo2', label: 'Título 2', type: 'text' },
      { id: 'lam_palette', label: 'Paleta de Cores', type: 'text' },
    ],
    'Destino 1': [
      { id: 'lam_d1_destino', label: 'Destino 1', type: 'text' },
      { id: 'lam_d1_saida', label: 'Saída 1', type: 'text' },
      { id: 'lam_d1_voo', label: 'Voo 1', type: 'text' },
      { id: 'lam_d1_periodo', label: 'Período 1', type: 'text' },
      { id: 'lam_d1_hotel', label: 'Hotel 1', type: 'text' },
      { id: 'lam_d1_incluso', label: 'Incluso 1', type: 'text' },
      { id: 'lam_d1_pgto', label: 'Pagamento 1', type: 'text' },
      { id: 'lam_d1_parcelas', label: 'Parcelas 1', type: 'text' },
      { id: 'lam_d1_valor', label: 'Valor 1', type: 'text' },
      { id: 'lam_d1_total', label: 'Total 1', type: 'text' },
    ],
    'Destino 2': [
      { id: 'lam_d2_destino', label: 'Destino 2', type: 'text' },
      { id: 'lam_d2_saida', label: 'Saída 2', type: 'text' },
      { id: 'lam_d2_voo', label: 'Voo 2', type: 'text' },
      { id: 'lam_d2_periodo', label: 'Período 2', type: 'text' },
      { id: 'lam_d2_hotel', label: 'Hotel 2', type: 'text' },
      { id: 'lam_d2_incluso', label: 'Incluso 2', type: 'text' },
      { id: 'lam_d2_pgto', label: 'Pagamento 2', type: 'text' },
      { id: 'lam_d2_parcelas', label: 'Parcelas 2', type: 'text' },
      { id: 'lam_d2_valor', label: 'Valor 2', type: 'text' },
      { id: 'lam_d2_total', label: 'Total 2', type: 'text' },
    ],
    'Destino 3': [
      { id: 'lam_d3_destino', label: 'Destino 3', type: 'text' },
      { id: 'lam_d3_saida', label: 'Saída 3', type: 'text' },
      { id: 'lam_d3_voo', label: 'Voo 3', type: 'text' },
      { id: 'lam_d3_periodo', label: 'Período 3', type: 'text' },
      { id: 'lam_d3_hotel', label: 'Hotel 3', type: 'text' },
      { id: 'lam_d3_incluso', label: 'Incluso 3', type: 'text' },
      { id: 'lam_d3_pgto', label: 'Pagamento 3', type: 'text' },
      { id: 'lam_d3_parcelas', label: 'Parcelas 3', type: 'text' },
      { id: 'lam_d3_valor', label: 'Valor 3', type: 'text' },
      { id: 'lam_d3_total', label: 'Total 3', type: 'text' },
    ],
    'Destino 4': [
      { id: 'lam_d4_destino', label: 'Destino 4', type: 'text' },
      { id: 'lam_d4_saida', label: 'Saída 4', type: 'text' },
      { id: 'lam_d4_voo', label: 'Voo 4', type: 'text' },
      { id: 'lam_d4_periodo', label: 'Período 4', type: 'text' },
      { id: 'lam_d4_hotel', label: 'Hotel 4', type: 'text' },
      { id: 'lam_d4_incluso', label: 'Incluso 4', type: 'text' },
      { id: 'lam_d4_pgto', label: 'Pagamento 4', type: 'text' },
      { id: 'lam_d4_parcelas', label: 'Parcelas 4', type: 'text' },
      { id: 'lam_d4_valor', label: 'Valor 4', type: 'text' },
      { id: 'lam_d4_total', label: 'Total 4', type: 'text' },
    ],
    Loja: [
      { id: 'logo_loja', label: 'Logo Azul Viagens', type: 'image' },
    ],
  },
};

/**
 * Retorna lista plana de todos os binds de um tipo de formulário
 */
export function getAllBindsForForm(formType: string): BindDefinition[] {
  const categories = BINDS_POR_FORM[formType];
  if (!categories) return [];

  const allBinds: BindDefinition[] = [];
  for (const category of Object.values(categories)) {
    allBinds.push(...category);
  }
  return allBinds;
}

/**
 * Retorna um bind específico por id e formType
 */
export function getBindById(formType: string, bindId: string): BindDefinition | undefined {
  const allBinds = getAllBindsForForm(formType);
  return allBinds.find(b => b.id === bindId);
}
