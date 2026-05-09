/* ══ Editor Icon Library ════════════════════════════ */

export interface EditorIcon {
  id: string;
  name: string;
  keywords?: string[];
  /** Inner SVG content (path, circle, rect etc.) */
  paths: string;
  /** "stroke" = fill:none, stroke=color; "fill" = fill=color */
  style: "stroke" | "fill";
}

export interface IconCategory {
  id: string;
  label: string;
  icons: EditorIcon[];
}

// ── VIAGEM ────────────────────────────────────────────
const viagem: EditorIcon[] = [
  {
    id: "plane",
    name: "Avião",
    keywords: ["airplane", "flight", "voo"],
    style: "stroke",
    paths: `<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.9 1 0 .3.1.6.3.8l4.9 5.1-1.6 4.5c-.2.5 0 1 .4 1.3.2.2.5.3.8.3.3 0 .6-.1.8-.3l4.5-1.6 5.1 4.9c.2.2.5.3.8.3.5 0 .9-.4 1-.9z"/>`,
  },
  {
    id: "plane-takeoff",
    name: "Decolagem",
    keywords: ["takeoff", "departure", "partida"],
    style: "stroke",
    paths: `<path d="M2 22h20"/><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1A2 2 0 0 0 6 13h3l6.6 7"/><path d="M10 15.5V11a2 2 0 0 1 4 0v4.5"/><path d="M16 15.5V13a2 2 0 0 1 4 0v2.5"/>`,
  },
  {
    id: "luggage",
    name: "Mala",
    keywords: ["suitcase", "bagagem", "travel bag"],
    style: "stroke",
    paths: `<path d="M6 20a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z"/><path d="M8 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/><line x1="6" y1="14" x2="18" y2="14"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/>`,
  },
  {
    id: "map-pin",
    name: "Localização",
    keywords: ["location", "pin", "destino", "place"],
    style: "stroke",
    paths: `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
  },
  {
    id: "camera",
    name: "Câmera",
    keywords: ["photo", "foto", "picture"],
    style: "stroke",
    paths: `<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>`,
  },
  {
    id: "compass",
    name: "Bússola",
    keywords: ["compass", "navigation", "norte"],
    style: "stroke",
    paths: `<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>`,
  },
  {
    id: "map",
    name: "Mapa",
    keywords: ["map", "navigation", "route"],
    style: "stroke",
    paths: `<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>`,
  },
  {
    id: "passport",
    name: "Passaporte",
    keywords: ["book", "documento", "travel document"],
    style: "stroke",
    paths: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  },
  {
    id: "umbrella-beach",
    name: "Praia",
    keywords: ["beach", "umbrella", "guarda-sol", "verão", "summer"],
    style: "stroke",
    paths: `<path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"/>`,
  },
  {
    id: "sun",
    name: "Sol",
    keywords: ["sunny", "weather", "verão"],
    style: "stroke",
    paths: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`,
  },
  {
    id: "palm-tree",
    name: "Palmeira",
    keywords: ["tropical", "palm", "island", "ilha"],
    style: "stroke",
    paths: `<path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"/><path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"/><path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35z"/><path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.23-10-1.5-11.5z"/>`,
  },
  {
    id: "wave",
    name: "Ondas",
    keywords: ["wave", "ocean", "mar", "sea"],
    style: "stroke",
    paths: `<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>`,
  },
];

// ── TRANSPORTE ────────────────────────────────────────
const transporte: EditorIcon[] = [
  {
    id: "bus",
    name: "Ônibus",
    keywords: ["bus", "transfer", "transport"],
    style: "stroke",
    paths: `<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 12h20"/><path d="M7 6V4"/><path d="M17 6V4"/><circle cx="7" cy="18" r="1"/><circle cx="17" cy="18" r="1"/>`,
  },
  {
    id: "train",
    name: "Trem",
    keywords: ["train", "railway", "metro"],
    style: "stroke",
    paths: `<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="M8 19l-2 3"/><path d="M18 22l-2-3"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>`,
  },
  {
    id: "ship",
    name: "Navio",
    keywords: ["ship", "cruise", "cruzeiro", "boat"],
    style: "stroke",
    paths: `<path d="M18 8h1a4 4 0 0 1 0 8H5"/><path d="M2 15a4 4 0 0 1 4-4h12"/><path d="M6 8H2"/><path d="M10 2v6"/><path d="M5 12v5a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-5"/><path d="M2 20a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2"/>`,
  },
  {
    id: "car",
    name: "Carro",
    keywords: ["car", "vehicle", "transfer"],
    style: "stroke",
    paths: `<rect x="1" y="8" width="22" height="10" rx="2"/><path d="M5 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>`,
  },
  {
    id: "anchor",
    name: "Âncora",
    keywords: ["anchor", "sea", "marine", "porto"],
    style: "stroke",
    paths: `<circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>`,
  },
  {
    id: "sailboat",
    name: "Veleiro",
    keywords: ["sailboat", "sail", "boat", "barco"],
    style: "stroke",
    paths: `<path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4z"/><path d="M21 14 12.99 2 5 14h16z"/><line x1="12" y1="2" x2="12" y2="14"/>`,
  },
  {
    id: "helicopter",
    name: "Helicóptero",
    keywords: ["helicopter", "helo", "air"],
    style: "stroke",
    paths: `<path d="M10 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/><path d="M2 8h6M16 8h6M12 8v4"/><path d="M5 12h14l2 4H3l2-4z"/><path d="M7 16v2"/><path d="M17 16v2"/>`,
  },
  {
    id: "bike",
    name: "Bicicleta",
    keywords: ["bike", "bicycle", "cycling"],
    style: "stroke",
    paths: `<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M12 17V7h4l2 4"/><path d="M8 17l3-8"/><path d="M5 17h14"/>`,
  },
];

// ── HOTEL ─────────────────────────────────────────────
const hotel: EditorIcon[] = [
  {
    id: "building",
    name: "Hotel",
    keywords: ["building", "prédio", "hotel", "accommodation"],
    style: "stroke",
    paths: `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z"/><path d="M6 12H4a2 2 0 0 0-2 2v6h4"/><path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>`,
  },
  {
    id: "bed",
    name: "Cama",
    keywords: ["bed", "sleep", "quarto", "room"],
    style: "stroke",
    paths: `<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>`,
  },
  {
    id: "key",
    name: "Chave",
    keywords: ["key", "checkin", "room", "access"],
    style: "stroke",
    paths: `<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>`,
  },
  {
    id: "star",
    name: "Estrela",
    keywords: ["star", "rating", "quality", "avaliação"],
    style: "stroke",
    paths: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  },
  {
    id: "star-filled",
    name: "Estrela Cheia",
    keywords: ["star", "filled", "rating", "avaliação"],
    style: "fill",
    paths: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  },
  {
    id: "waves",
    name: "Piscina",
    keywords: ["pool", "piscina", "swim", "water"],
    style: "stroke",
    paths: `<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>`,
  },
  {
    id: "coffee",
    name: "Café",
    keywords: ["coffee", "breakfast", "café da manhã", "cup"],
    style: "stroke",
    paths: `<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>`,
  },
  {
    id: "utensils",
    name: "Restaurante",
    keywords: ["restaurant", "food", "dining", "refeição"],
    style: "stroke",
    paths: `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>`,
  },
  {
    id: "wifi",
    name: "Wi-Fi",
    keywords: ["wifi", "internet", "wireless"],
    style: "stroke",
    paths: `<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>`,
  },
];

// ── SERVIÇOS ─────────────────────────────────────────
const servicos: EditorIcon[] = [
  {
    id: "check",
    name: "Check",
    keywords: ["check", "done", "confirm", "incluso"],
    style: "stroke",
    paths: `<polyline points="20 6 9 17 4 12"/>`,
  },
  {
    id: "check-circle",
    name: "Check Círculo",
    keywords: ["check", "circle", "done", "confirm"],
    style: "stroke",
    paths: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
  },
  {
    id: "calendar",
    name: "Calendário",
    keywords: ["calendar", "date", "data", "schedule"],
    style: "stroke",
    paths: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
  },
  {
    id: "clock",
    name: "Relógio",
    keywords: ["clock", "time", "hora", "horario"],
    style: "stroke",
    paths: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  },
  {
    id: "credit-card",
    name: "Cartão",
    keywords: ["credit card", "payment", "pagamento"],
    style: "stroke",
    paths: `<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>`,
  },
  {
    id: "dollar",
    name: "Dinheiro",
    keywords: ["dollar", "money", "price", "preço", "valor"],
    style: "stroke",
    paths: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
  },
  {
    id: "phone",
    name: "Telefone",
    keywords: ["phone", "call", "contato", "contact"],
    style: "stroke",
    paths: `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>`,
  },
  {
    id: "mail",
    name: "E-mail",
    keywords: ["email", "mail", "envelope", "mensagem"],
    style: "stroke",
    paths: `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>`,
  },
  {
    id: "users",
    name: "Pessoas",
    keywords: ["users", "group", "turistas", "people", "passageiros"],
    style: "stroke",
    paths: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  },
  {
    id: "tag",
    name: "Etiqueta",
    keywords: ["tag", "price", "promo", "oferta", "label"],
    style: "stroke",
    paths: `<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>`,
  },
  {
    id: "flag",
    name: "Bandeira",
    keywords: ["flag", "country", "destino"],
    style: "stroke",
    paths: `<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>`,
  },
  {
    id: "percent",
    name: "Desconto",
    keywords: ["percent", "discount", "desconto", "oferta"],
    style: "stroke",
    paths: `<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>`,
  },
];

// ── SETAS ─────────────────────────────────────────────
const setas: EditorIcon[] = [
  {
    id: "arrow-right",
    name: "Seta Direita",
    keywords: ["arrow", "right", "next"],
    style: "stroke",
    paths: `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,
  },
  {
    id: "arrow-left",
    name: "Seta Esquerda",
    keywords: ["arrow", "left", "back", "voltar"],
    style: "stroke",
    paths: `<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>`,
  },
  {
    id: "arrow-up",
    name: "Seta Cima",
    keywords: ["arrow", "up"],
    style: "stroke",
    paths: `<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>`,
  },
  {
    id: "arrow-down",
    name: "Seta Baixo",
    keywords: ["arrow", "down"],
    style: "stroke",
    paths: `<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>`,
  },
  {
    id: "chevron-right",
    name: "Chevron Direita",
    keywords: ["chevron", "arrow", "right"],
    style: "stroke",
    paths: `<polyline points="9 18 15 12 9 6"/>`,
  },
  {
    id: "chevron-left",
    name: "Chevron Esquerda",
    keywords: ["chevron", "arrow", "left"],
    style: "stroke",
    paths: `<polyline points="15 18 9 12 15 6"/>`,
  },
  {
    id: "arrow-right-circle",
    name: "Seta Círculo",
    keywords: ["arrow", "circle", "button"],
    style: "stroke",
    paths: `<circle cx="12" cy="12" r="10"/><polyline points="12 16 16 12 12 8"/><line x1="8" y1="12" x2="16" y2="12"/>`,
  },
  {
    id: "arrows-right-left",
    name: "Seta Dupla",
    keywords: ["arrows", "exchange", "transfer", "dois lados"],
    style: "stroke",
    paths: `<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>`,
  },
  {
    id: "rotate-cw",
    name: "Rotacionar",
    keywords: ["rotate", "refresh", "circular"],
    style: "stroke",
    paths: `<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>`,
  },
];

// ── SÍMBOLOS ──────────────────────────────────────────
const simbolos: EditorIcon[] = [
  {
    id: "heart",
    name: "Coração",
    keywords: ["heart", "love", "like", "favorito"],
    style: "stroke",
    paths: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
  },
  {
    id: "heart-filled",
    name: "Coração Cheio",
    keywords: ["heart", "love", "filled"],
    style: "fill",
    paths: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
  },
  {
    id: "info",
    name: "Informação",
    keywords: ["info", "help", "question"],
    style: "stroke",
    paths: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/>`,
  },
  {
    id: "alert",
    name: "Alerta",
    keywords: ["alert", "warning", "atenção", "aviso"],
    style: "stroke",
    paths: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
  },
  {
    id: "moon",
    name: "Lua",
    keywords: ["moon", "night", "noite"],
    style: "stroke",
    paths: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,
  },
  {
    id: "trophy",
    name: "Troféu",
    keywords: ["trophy", "award", "winner", "prêmio"],
    style: "stroke",
    paths: `<line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/><path d="M7 4H4a2 2 0 0 0-2 2v2c0 1.7 1.3 3 3 3s3-1.3 3-3V4"/><path d="M17 4h3a2 2 0 0 1 2 2v2c0 1.7-1.3 3-3 3s-3-1.3-3-3V4"/><path d="M7 4h10v8a5 5 0 0 1-10 0V4z"/>`,
  },
  {
    id: "gift",
    name: "Presente",
    keywords: ["gift", "presente", "bonus", "promo"],
    style: "stroke",
    paths: `<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>`,
  },
  {
    id: "diamond",
    name: "Diamante",
    keywords: ["diamond", "luxury", "premium", "luxo"],
    style: "stroke",
    paths: `<path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0L2.7 10.3z"/>`,
  },
  {
    id: "circle-check",
    name: "Incluso",
    keywords: ["included", "check", "incluso", "ok"],
    style: "fill",
    paths: `<path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm4.71 7.71-5 5a1 1 0 0 1-1.42 0l-2-2a1 1 0 0 1 1.42-1.42l1.29 1.3 4.29-4.3a1 1 0 0 1 1.42 1.42z"/>`,
  },
  {
    id: "zap",
    name: "Relâmpago",
    keywords: ["zap", "lightning", "energy", "rápido", "fast"],
    style: "stroke",
    paths: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  },
];

// ── SOCIAL ────────────────────────────────────────────
const social: EditorIcon[] = [
  {
    id: "instagram",
    name: "Instagram",
    keywords: ["instagram", "social", "photo"],
    style: "stroke",
    paths: `<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>`,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    keywords: ["whatsapp", "chat", "message"],
    style: "stroke",
    paths: `<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>`,
  },
  {
    id: "facebook",
    name: "Facebook",
    keywords: ["facebook", "social", "fb"],
    style: "stroke",
    paths: `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>`,
  },
  {
    id: "twitter",
    name: "Twitter/X",
    keywords: ["twitter", "x", "social", "tweet"],
    style: "stroke",
    paths: `<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>`,
  },
  {
    id: "youtube",
    name: "YouTube",
    keywords: ["youtube", "video", "play"],
    style: "stroke",
    paths: `<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.95 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>`,
  },
  {
    id: "tiktok",
    name: "TikTok",
    keywords: ["tiktok", "social", "video"],
    style: "stroke",
    paths: `<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>`,
  },
  {
    id: "share",
    name: "Compartilhar",
    keywords: ["share", "compartilhar", "send"],
    style: "stroke",
    paths: `<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>`,
  },
];

// ── Export ────────────────────────────────────────────
export const ICON_CATEGORIES: IconCategory[] = [
  { id: "viagem", label: "Viagem", icons: viagem },
  { id: "transporte", label: "Transporte", icons: transporte },
  { id: "hotel", label: "Hotel", icons: hotel },
  { id: "servicos", label: "Serviços", icons: servicos },
  { id: "setas", label: "Setas", icons: setas },
  { id: "simbolos", label: "Símbolos", icons: simbolos },
  { id: "social", label: "Social", icons: social },
];

export const ALL_ICONS: EditorIcon[] = ICON_CATEGORIES.flatMap(c => c.icons);

export function buildSvgDataUrl(icon: EditorIcon, color: string, size = 64): string {
  const strokeAttrs = `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const fillAttrs = `fill="${color}"`;
  const attrs = icon.style === "stroke" ? strokeAttrs : fillAttrs;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" ${attrs}>${icon.paths}</svg>`;
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}
