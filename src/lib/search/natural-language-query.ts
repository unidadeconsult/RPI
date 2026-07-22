import { normalizeName } from "@/lib/parser/normalize-text";
import type { PublicationFilters } from "@/lib/dashboard/publication-filters";

export type ParsedNaturalLanguageQuery = {
  filters: Partial<PublicationFilters>;
  recognized: { label: string; value: string }[];
  leftoverText: string;
};

const CATEGORY_KEYWORDS: { category: PublicationFilters["category"]; pattern: RegExp; label: string }[] = [
  { category: "INDEFERIMENTO", pattern: /\bindeferiment\w*/i, label: "Indeferimentos" },
  { category: "DEFERIMENTO", pattern: /\bdeferiment\w*/i, label: "Deferimentos" },
  { category: "OPOSICAO", pattern: /\boposi[cç][aã]o\b|\boposi[cç][oõ]es\b/i, label: "Oposições" },
  { category: "NULIDADE", pattern: /\bnulidade\w*/i, label: "Nulidades" },
  { category: "CADUCIDADE", pattern: /\bcaducidade\w*/i, label: "Caducidades" },
  { category: "ARQUIVAMENTO", pattern: /\barquivament\w*/i, label: "Arquivamentos" },
  { category: "PUBLICACAO", pattern: /\bpublica[cç][aã]o\b|\bpublica[cç][oõ]es\b/i, label: "Publicações" },
];

const CONFIDENCE_KEYWORDS: { confidence: PublicationFilters["confidence"]; pattern: RegExp; label: string }[] = [
  { confidence: "ALTA", pattern: /confian[cç]a\s+alta|alta\s+confian[cç]a/i, label: "Confiança alta" },
  { confidence: "MEDIA", pattern: /confian[cç]a\s+m[eé]dia|m[eé]dia\s+confian[cç]a/i, label: "Confiança média" },
  { confidence: "BAIXA", pattern: /confian[cç]a\s+baixa|baixa\s+confian[cç]a/i, label: "Confiança baixa" },
];

/**
 * Traduz uma busca em linguagem natural (português) para os filtros
 * estruturados ja existentes no dashboard (secao 21). Esta funcao NAO usa
 * nenhum servico externo de IA -- e um reconhecimento local de padroes e
 * palavras-chave, deterministico e totalmente testavel. Quando um trecho da
 * busca nao e reconhecido, ele e devolvido em `leftoverText` em vez de ser
 * descartado silenciosamente.
 */
export function parseNaturalLanguageQuery(rawQuery: string): ParsedNaturalLanguageQuery {
  let remaining = rawQuery;
  const filters: Partial<PublicationFilters> = {};
  const recognized: { label: string; value: string }[] = [];

  const consume = (pattern: RegExp): RegExpMatchArray | null => {
    const match = remaining.match(pattern);
    if (match) {
      remaining = (remaining.slice(0, match.index) + remaining.slice((match.index ?? 0) + match[0].length)).trim();
    }
    return match;
  };

  const quoted = consume(/"([^"]+)"/);
  if (quoted) {
    filters.trademark = quoted[1].trim();
    recognized.push({ label: "Marca contém", value: quoted[1].trim() });
  }

  const rpiMatch = consume(/\brpi\s*(?:n[ºo°.]*\s*)?(\d{3,6})\b/i);
  if (rpiMatch) {
    filters.rpiNumber = rpiMatch[1];
    recognized.push({ label: "Nº da RPI", value: rpiMatch[1] });
  }

  const processMatch = consume(/\b(\d{6,})\b/);
  if (processMatch) {
    filters.processNumber = processMatch[1];
    recognized.push({ label: "Nº do processo", value: processMatch[1] });
  }

  for (const { category, pattern, label } of CATEGORY_KEYWORDS) {
    if (!filters.category) {
      const match = consume(pattern);
      if (match) {
        filters.category = category;
        recognized.push({ label: "Categoria", value: label });
      }
    }
  }

  for (const { confidence, pattern, label } of CONFIDENCE_KEYWORDS) {
    if (!filters.confidence) {
      const match = consume(pattern);
      if (match) {
        filters.confidence = confidence;
        recognized.push({ label: "Confiança", value: label });
      }
    }
  }

  const naoRevisado = consume(/n[aã]o\s+revisad\w*|pendente\w*\s+de\s+revis[aã]o/i);
  if (naoRevisado) {
    filters.reviewStatus = "NAO_REVISADO";
    recognized.push({ label: "Revisão", value: "Não revisado" });
  } else {
    const revisado = consume(/\brevisad\w*/i);
    if (revisado) {
      filters.reviewStatus = "REVISADO";
      recognized.push({ label: "Revisão", value: "Revisado" });
    }
  }

  const semCliente = consume(/sem\s+cliente|fora\s+da\s+carteira/i);
  if (semCliente) {
    filters.semCliente = true;
    recognized.push({ label: "Carteira", value: "Somente processos fora da carteira" });
  }

  const peMatch = consume(/pernambuco|\/pe\b|\bpe\b/i);
  if (peMatch) {
    filters.peOnly = true;
    recognized.push({ label: "Filtro /PE", value: "Somente Pernambuco" });
  }

  // UF e extraido antes das capturas gulosas de marca/titular abaixo, senao
  // "titular ACME uf SP" teria o "uf SP" engolido pela captura de titular.
  const ufMatch = consume(/\b(?:uf|estado)\s+([a-z]{2})\b/i);
  if (ufMatch) {
    filters.uf = ufMatch[1].toUpperCase();
    recognized.push({ label: "UF do titular", value: ufMatch[1].toUpperCase() });
  }

  if (!filters.trademark) {
    const trademarkMatch = consume(/\bmarca\s+([a-zà-ú0-9][a-zà-ú0-9 ]*)/i);
    if (trademarkMatch) {
      filters.trademark = trademarkMatch[1].trim();
      recognized.push({ label: "Marca contém", value: trademarkMatch[1].trim() });
    }
  }

  const holderMatch = consume(/\btitular\s+([a-zà-ú0-9][a-zà-ú0-9 ]*)/i);
  if (holderMatch) {
    filters.holder = holderMatch[1].trim();
    recognized.push({ label: "Titular contém", value: holderMatch[1].trim() });
  }

  const leftoverText = normalizeName(remaining) === "" ? "" : remaining.trim();

  return { filters, recognized, leftoverText };
}

export function buildSearchQueryString(filters: Partial<PublicationFilters>): string {
  const params = new URLSearchParams();
  if (filters.rpiNumber) params.set("rpiNumber", filters.rpiNumber);
  if (filters.category) params.set("category", filters.category);
  if (filters.processNumber) params.set("processNumber", filters.processNumber);
  if (filters.trademark) params.set("trademark", filters.trademark);
  if (filters.holder) params.set("holder", filters.holder);
  if (filters.uf) params.set("uf", filters.uf);
  if (filters.peOnly) params.set("peOnly", "on");
  if (filters.semCliente) params.set("semCliente", "on");
  if (filters.confidence) params.set("confidence", filters.confidence);
  if (filters.reviewStatus) params.set("reviewStatus", filters.reviewStatus);
  return params.toString();
}
