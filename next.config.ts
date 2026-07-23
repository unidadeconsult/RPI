import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @napi-rs/canvas tem um binario nativo (.node) que o empacotador do
  // Next.js (Turbopack) nao consegue incluir num chunk ESM -- precisa
  // ficar de fora do bundle e ser resolvido via node_modules em tempo de
  // execucao, como qualquer addon nativo do Node. O pdfjs-dist em si
  // continua sendo empacotado normalmente (ver comentario em
  // apol-pdf-text.ts sobre por que ele NAO pode ser external).
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
