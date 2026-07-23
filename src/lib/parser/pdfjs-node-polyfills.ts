import { DOMMatrix, Path2D } from "@napi-rs/canvas";

// pdfjs-dist referencia DOMMatrix/Path2D no topo do modulo (fora de
// qualquer funcao) para operacoes de path/clip -- se esses globais nao
// existirem no momento em que o modulo e avaliado, a importacao inteira
// falha com ReferenceError, antes mesmo do nosso codigo rodar. O proprio
// pdfjs-dist tenta um require() interno e dinamico de @napi-rs/canvas
// para preencher isso, mas esse require dinamico nao e rastreavel pelo
// empacotador do Next.js e o binario nativo acaba nao indo para o
// deploy da Vercel. Importando aqui de forma estatica (e obrigando este
// arquivo a ser avaliado antes do pdfjs-dist, ver apol-pdf-text.ts),
// garantimos que o binario nativo seja detectado e incluido no build.
const globalWithDomPolyfills = globalThis as unknown as Record<string, unknown>;

globalWithDomPolyfills.DOMMatrix ??= DOMMatrix;
globalWithDomPolyfills.Path2D ??= Path2D;
