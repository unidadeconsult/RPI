/**
 * Normalizacao de nomes conforme a secao 3 do escopo: maiusculas, sem
 * acentos, espacos/quebras de linha colapsados, sem pontuacao irrelevante.
 * O valor original encontrado no arquivo deve sempre ser preservado a parte
 * pelo chamador -- esta funcao nunca deve substituir o dado bruto armazenado.
 */
const COMBINING_DIACRITICAL_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function normalizeName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(COMBINING_DIACRITICAL_MARKS, "")
    .toUpperCase()
    .replace(/[.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
