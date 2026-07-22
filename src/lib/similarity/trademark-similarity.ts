import { normalizeName } from "@/lib/parser/normalize-text";

/**
 * Algoritmo de similaridade puramente local (coeficiente de Dice sobre
 * bigramas de caracteres) -- nenhum dado de marca ou cliente e enviado a
 * servicos externos de IA, conforme exigido pelo escopo (secao 20).
 */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  const bigrams = (s: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bigram = s.slice(i, i + 2);
      map.set(bigram, (map.get(bigram) ?? 0) + 1);
    }
    return map;
  };

  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  let intersection = 0;
  for (const [bigram, countA] of bigramsA) {
    const countB = bigramsB.get(bigram);
    if (countB) intersection += Math.min(countA, countB);
  }

  const totalA = [...bigramsA.values()].reduce((sum, n) => sum + n, 0);
  const totalB = [...bigramsB.values()].reduce((sum, n) => sum + n, 0);
  return (2 * intersection) / (totalA + totalB);
}

/**
 * Remove termos ignorados (cadastrados pelo administrador, ex.: "BRASIL",
 * "COMERCIO") do texto normalizado antes da comparacao, para que palavras
 * genericas nao infllem no score de similaridade.
 */
export function stripIgnoredTerms(normalizedText: string, ignoredTermsNormalized: string[]): string {
  if (ignoredTermsNormalized.length === 0) return normalizedText;
  const words = normalizedText.split(" ").filter((w) => w && !ignoredTermsNormalized.includes(w));
  return words.join(" ");
}

export type NameScoreResult = { score: number; matchedTerm: string };

/**
 * Compara o nome candidato com a expressao principal e as variacoes
 * cadastradas, retornando o maior score encontrado e qual termo bateu.
 */
export function computeNameScore(
  candidateNameRaw: string,
  monitored: { mainExpression: string; variations: string[]; ignoredTerms: string[] },
): NameScoreResult {
  const ignoredNormalized = monitored.ignoredTerms.map((t) => normalizeName(t));
  const candidate = stripIgnoredTerms(normalizeName(candidateNameRaw), ignoredNormalized);

  const candidates = [monitored.mainExpression, ...monitored.variations];
  let best: NameScoreResult = { score: 0, matchedTerm: monitored.mainExpression };

  for (const term of candidates) {
    const normalizedTerm = stripIgnoredTerms(normalizeName(term), ignoredNormalized);
    const score = diceCoefficient(candidate, normalizedTerm);
    if (score > best.score) {
      best = { score, matchedTerm: term };
    }
  }

  return best;
}

export type MatchTypeOrNull = "IDENTICA" | "ALTA" | "MEDIA" | "BAIXA" | "REVISAR" | null;

/**
 * Classifica o score numa faixa de confianca (secao 20). Nunca decide
 * sozinho que ha colidencia juridica -- apenas rotula o nivel de
 * semelhanca textual para o profissional revisar.
 */
export function classifyMatchType(score: number): MatchTypeOrNull {
  if (score >= 0.95) return "IDENTICA";
  if (score >= 0.85) return "ALTA";
  if (score >= 0.7) return "MEDIA";
  if (score >= 0.5) return "BAIXA";
  return null;
}

export function niceClassesOverlap(monitoredClasses: string[], candidateClasses: string[]): boolean {
  if (monitoredClasses.length === 0 || candidateClasses.length === 0) return false;
  const set = new Set(monitoredClasses.map((c) => c.trim()));
  return candidateClasses.some((c) => set.has(c.trim()));
}

export type EvaluateMatchParams = {
  monitored: {
    mainExpression: string;
    variations: string[];
    ignoredTerms: string[];
    niceClasses: string[];
    titular: string | null;
    minSimilarity: number;
  };
  candidate: {
    trademarkName: string;
    niceClasses: string[];
    titularNames: string[];
  };
};

export type SimilarityEvaluation = {
  score: number;
  matchType: Exclude<MatchTypeOrNull, null>;
  matchedTerm: string;
  niceClassMatch: boolean;
  titularDiffers: boolean;
  reasonDetails: string;
};

/**
 * Avalia uma marca monitorada contra uma marca candidata publicada na RPI.
 * Retorna null quando o score fica abaixo do minimo configurado -- neste
 * caso nenhum registro de semelhanca deve ser criado (nao gera ruido).
 */
export function evaluateMonitoredMatch(params: EvaluateMatchParams): SimilarityEvaluation | null {
  const { monitored, candidate } = params;
  const { score, matchedTerm } = computeNameScore(candidate.trademarkName, monitored);

  if (score < monitored.minSimilarity) return null;

  const matchType = classifyMatchType(score);
  if (!matchType) return null;

  const niceClassMatch = niceClassesOverlap(monitored.niceClasses, candidate.niceClasses);
  const titularDiffers = monitored.titular
    ? !candidate.titularNames.some((name) => normalizeName(name) === normalizeName(monitored.titular!))
    : true;

  const reasonDetails =
    `Similaridade textual de ${(score * 100).toFixed(1)}% entre "${candidate.trademarkName}" e "${matchedTerm}"` +
    (niceClassMatch ? "; classes NCL em comum" : "; sem sobreposicao de classes NCL configuradas") +
    (titularDiffers ? "; titular diferente do monitorado" : "; mesmo titular do monitorado");

  return { score, matchType, matchedTerm, niceClassMatch, titularDiffers, reasonDetails };
}
