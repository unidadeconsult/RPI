/**
 * Separa as linhas de titular do relatorio APOL em titulares individuais.
 * Um registro pode ter co-titulares em estados diferentes na mesma
 * publicacao (ex.: "ALBERTO FALAO DE SOUSA (BR/SC), ELVIS DA SILVA LOPES
 * (BR/SP), MURILO ALVES (BR/PE)"), possivelmente distribuidos em mais de
 * uma linha fisica quando o texto e longo.
 */
export type SplitHolder = {
  nameRaw: string;
  cpfCnpj: string | null;
  uf: string | null;
};

const HOLDER_ENTRY_PATTERN = /([^,]*?\(BR\/([A-Z]{2})\))/g;
const LEADING_DOCUMENT_PATTERN = /^([\d./-]{8,})\s+(.+)$/;

export function splitHolders(holderLines: string[]): SplitHolder[] {
  const joined = holderLines.join(" ").replace(/\s+/g, " ").trim();
  if (joined === "") return [];

  const matches = [...joined.matchAll(HOLDER_ENTRY_PATTERN)];

  const rawEntries =
    matches.length > 0 ? matches.map((m) => m[1].trim()) : [joined];

  return rawEntries
    .filter((entry) => entry !== "")
    .map((entry) => {
      const docMatch = entry.match(LEADING_DOCUMENT_PATTERN);
      const nameRaw = docMatch ? docMatch[2] : entry;
      const cpfCnpj = docMatch ? docMatch[1] : null;
      const ufMatch = nameRaw.match(/\(BR\/([A-Z]{2})\)/);
      return {
        nameRaw: nameRaw.trim(),
        cpfCnpj,
        uf: ufMatch ? ufMatch[1] : null,
      };
    });
}
