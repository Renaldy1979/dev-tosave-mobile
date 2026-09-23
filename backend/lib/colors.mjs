/**
 * Tradução das cores da origem (inglês, texto livre) para português.
 *
 * Regras (decisão do usuário: traduzir na migração):
 * - só traduz quando TODAS as palavras são conhecidas (cor + modificador);
 * - códigos hex (#ffd300) e nomes próprios de pintura ("rosso corsa",
 *   "miami blue") ficam como estão;
 * - valores que não são cor (nome de série, "standard") viram "".
 * A primeira letra sai maiúscula.
 */

const BASE = {
  blue: "Azul", red: "Vermelho", yellow: "Amarelo", green: "Verde", black: "Preto",
  purple: "Roxo", orange: "Laranja", gray: "Cinza", grey: "Cinza", white: "Branco",
  silver: "Prata", lime: "Verde-limão", brown: "Marrom", pink: "Rosa", gold: "Dourado",
  tan: "Bege", beige: "Bege", aqua: "Água-marinha", teal: "Verde-azulado",
  lavender: "Lavanda", burgundy: "Bordô", maroon: "Vinho", copper: "Cobre",
  turquoise: "Turquesa", cyan: "Ciano", violet: "Violeta", cream: "Creme",
  zamac: "Zamac", lightblue: "Azul-claro", skyblue: "Azul-celeste", deepred: "Vermelho-escuro",
  navy: "Azul-marinho", olive: "Verde-oliva", emerald: "Esmeralda", magenta: "Magenta",
  // Valores que já estavam em português.
  azul: "Azul", vermelho: "Vermelho", preto: "Preto", amarelo: "Amarelo", verde: "Verde",
  laranja: "Laranja", marrom: "Marrom", branca: "Branca", branco: "Branco",
};

/** Combinações de duas palavras que viram um nome só. */
const COMPOUND = {
  "light blue": "Azul-claro", "sky blue": "Azul-celeste", "dark blue": "Azul-escuro",
  "navy blue": "Azul-marinho", "baby blue": "Azul-bebê", "lime green": "Verde-limão",
  "olive green": "Verde-oliva", "emerald green": "Verde-esmeralda",
};

/** Modificadores que vêm antes da cor em inglês e depois em português. */
const MODIFIER = {
  light: "claro", dark: "escuro", metalflake: "metálico", metallic: "metálico",
  matte: "fosco", glossy: "brilhante", gloss: "brilhante", pearl: "perolado",
  pearlescent: "perolado", bright: "vivo",
};

const NOT_A_COLOR = /^(1999 |standard$)|series/;

function translateSingle(words) {
  const joined = words.join(" ");
  if (COMPOUND[joined]) return COMPOUND[joined];
  if (words.length === 1 && BASE[words[0]]) return BASE[words[0]];
  const mods = [];
  let rest = [...words];
  while (rest.length > 1 && MODIFIER[rest[0]]) mods.push(MODIFIER[rest.shift()]);
  const color = COMPOUND[rest.join(" ")] ?? (rest.length === 1 ? BASE[rest[0]] : undefined);
  if (!color || mods.length === 0) return undefined;
  return [color, ...mods].join(" ");
}

/**
 * @returns {{ value: string, rule: "vazio" | "traduzido" | "hex" | "original" | "descartado" }}
 */
export function translateColor(raw) {
  const original = (raw ?? "").trim();
  if (!original) return { value: "", rule: "vazio" };
  const lower = original.toLowerCase();
  if (/^#?[0-9a-f]{6}$/.test(lower)) return { value: lower.startsWith("#") ? lower : `#${lower}`, rule: "hex" };
  if (NOT_A_COLOR.test(lower)) return { value: "", rule: "descartado" };

  // "blue & red", "white and black" → "Azul e vermelho".
  const parts = lower.split(/\s*(?:&|\band\b)\s*/);
  const translated = parts.map((p) => translateSingle(p.split(/\s+/)));
  if (translated.every(Boolean)) {
    const text = translated.map((t, i) => (i === 0 ? t : t.toLowerCase())).join(" e ");
    return { value: text, rule: "traduzido" };
  }
  return { value: original.charAt(0).toUpperCase() + original.slice(1), rule: "original" };
}
