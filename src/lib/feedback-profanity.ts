import profanityTerms from "@/lib/feedback-profanity-terms.json";

type ProfanityDictionary = Record<"english" | "greek" | "french", string[][]>;

const dictionary = profanityTerms as ProfanityDictionary;

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
    .toLocaleLowerCase();
}

const blockedTerms = new Set(Object.values(dictionary).flat(2).map(normalize));

export function containsBlockedProfanity(values: Array<string | undefined>) {
  return values.some((value) => {
    if (!value) return false;
    const words = normalize(value).match(/\p{L}+/gu) ?? [];
    return words.some((word) => blockedTerms.has(word));
  });
}
