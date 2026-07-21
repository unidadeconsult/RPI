export class ParserNotReadyError extends Error {
  constructor(moduleName: string) {
    super(
      `${moduleName} ainda nao foi implementado. A Fase 2 (Importacao) exige a ` +
        "analise de uma RPI real (XML/ZIP/PDF) antes de definir esta extracao, " +
        "para nao inventar estrutura, tags ou regras (secoes 28, 32 e 34 do escopo).",
    );
    this.name = "ParserNotReadyError";
  }
}
