export const CATEGORIES = [
  { id: "basic", ja: "挨拶・基本", es: "Lo básico", icon: "👋" },
  { id: "number", ja: "数字・値段・時刻", es: "Números", icon: "🔢" },
  { id: "time", ja: "曜日・日付", es: "El tiempo", icon: "📅" },
  { id: "bar", ja: "バル・飲み物", es: "En el bar", icon: "🍷" },
  { id: "restaurant", ja: "レストラン", es: "Restaurante", icon: "🍽️" },
  { id: "food", ja: "料理・食材", es: "Comida", icon: "🥘" },
  { id: "shopping", ja: "買い物", es: "De compras", icon: "🛍️" },
  { id: "transport", ja: "交通", es: "Transporte", icon: "🚆" },
  { id: "hotel", ja: "ホテル", es: "Hotel", icon: "🛏️" },
  { id: "direction", ja: "道を尋ねる", es: "Direcciones", icon: "🧭" },
  { id: "sight", ja: "観光", es: "Turismo", icon: "⛪" },
  { id: "emergency", ja: "緊急・体調", es: "Emergencias", icon: "🚑" },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));
