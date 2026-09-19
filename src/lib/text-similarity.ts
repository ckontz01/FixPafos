/**
 * Language-tolerant text comparison for duplicate detection.
 *
 * Citizens report the same pothole in Greek, in Greeklish, in English and in
 * Russian. A keyword match fails immediately on that input: "λακκούβα",
 * "lakkouva" and "pothole" share no characters. The approach here is therefore
 * deliberately two-layered.
 *
 * This module is the cheap, deterministic layer. It folds Greek and Cyrillic
 * into a common Latin form so that Greek and its Greeklish transliteration
 * compare as the same word, strips accents and inflectional endings, and
 * scores the overlap. It genuinely catches same-language and Greek/Greeklish
 * duplicates, and it is the only signal available when the model provider is
 * unreachable.
 *
 * It cannot bridge genuinely different languages -- "pothole" and "яма" have no
 * lexical relationship -- so it never decides a match on its own. Semantic
 * judgement across languages is the model's job in lib/duplicates.ts, and this
 * score is one input to it.
 */

/** Greek letters and digraphs to the Latin forms Greeklish writers actually use. */
const GREEK_MAP: [RegExp, string][] = [
  [/θ/g, "th"],
  [/χ/g, "ch"],
  [/ψ/g, "ps"],
  [/ξ/g, "x"],
  [/ου/g, "ou"],
  [/αι/g, "e"],
  [/ει|οι|υι/g, "i"],
  [/αυ/g, "av"],
  [/ευ/g, "ev"],
  [/μπ/g, "b"],
  [/ντ/g, "d"],
  [/γκ|γγ/g, "g"],
  [/τσ/g, "ts"],
  [/τζ/g, "tz"],
  [/α/g, "a"],
  [/β/g, "v"],
  [/γ/g, "g"],
  [/δ/g, "d"],
  [/ε/g, "e"],
  [/ζ/g, "z"],
  [/η/g, "i"],
  [/ι/g, "i"],
  [/κ/g, "k"],
  [/λ/g, "l"],
  [/μ/g, "m"],
  [/ν/g, "n"],
  [/ο/g, "o"],
  [/π/g, "p"],
  [/ρ/g, "r"],
  [/σ|ς/g, "s"],
  [/τ/g, "t"],
  [/υ/g, "i"],
  [/φ/g, "f"],
  [/ω/g, "o"],
];

const CYRILLIC_MAP: [RegExp, string][] = [
  [/щ/g, "sch"],
  [/ш/g, "sh"],
  [/ч/g, "ch"],
  [/ц/g, "ts"],
  [/ю/g, "yu"],
  [/я/g, "ya"],
  [/ж/g, "zh"],
  [/ё/g, "yo"],
  [/а/g, "a"],
  [/б/g, "b"],
  [/в/g, "v"],
  [/г/g, "g"],
  [/д/g, "d"],
  [/е/g, "e"],
  [/з/g, "z"],
  [/и/g, "i"],
  [/й/g, "y"],
  [/к/g, "k"],
  [/л/g, "l"],
  [/м/g, "m"],
  [/н/g, "n"],
  [/о/g, "o"],
  [/п/g, "p"],
  [/р/g, "r"],
  [/с/g, "s"],
  [/т/g, "t"],
  [/у/g, "u"],
  [/ф/g, "f"],
  [/х/g, "h"],
  [/ы/g, "y"],
  [/э/g, "e"],
  [/ъ|ь/g, ""],
];

/** Very common words that carry no distinguishing signal, per language. */
const STOPWORDS = new Set([
  // Greek, after transliteration
  "o", "i", "to", "ton", "tin", "tis", "tou", "ke", "se", "me", "gia", "apo",
  "sto", "sti", "stin", "ston", "ena", "mia", "enas", "den", "tha", "einai",
  "poli", "pou", "afto", "afti",
  // English
  "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "is", "are",
  "was", "it", "this", "that", "there", "has", "have", "for", "with", "very",
  // Russian, after transliteration
  "i", "v", "na", "ne", "chto", "eto", "u", "po", "za", "s", "ochen", "zdes",
]);

/**
 * Reduce text to comparable tokens: one script, no accents, no inflection.
 * Greek and Cyrillic are folded to Latin so that a Greek word and its
 * Greeklish spelling normalise to the same token.
 */
export function normalizeForComparison(text: string): string[] {
  let value = text
    .toLowerCase()
    // Decompose and drop combining marks, so accents and diaereses fold away.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  for (const [pattern, replacement] of GREEK_MAP)
    value = value.replace(pattern, replacement);
  for (const [pattern, replacement] of CYRILLIC_MAP)
    value = value.replace(pattern, replacement);

  return value
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(stem)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Crude suffix trimming. Greek inflects heavily, so "lakkouva" and "lakkouves"
 * must collapse to one token; this is a blunt rule rather than a morphological
 * analyser, which is proportionate for a similarity prefilter.
 */
function stem(token: string): string {
  return token.length > 5
    ? token.replace(/(ides|ades|oun|ous|ies|es|as|is|os|on|ou|ed|ing|s)$/, "")
    : token;
}

/**
 * Overlap of two token sets, 0-1 (Sørensen-Dice). Dice rather than Jaccard
 * because civic reports vary a lot in length -- one person writes three words
 * and another writes three sentences about the same pothole -- and Dice is
 * less punishing of that asymmetry.
 */
export function lexicalSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeForComparison(a));
  const setB = new Set(normalizeForComparison(b));
  if (!setA.size || !setB.size) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return (2 * shared) / (setA.size + setB.size);
}
