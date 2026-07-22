export type ComparisonStatus = "ADICIONADA" | "REMOVIDA" | "ALTERADA";

export type ComparisonDetailEntry = {
  processNumber: string;
  status: ComparisonStatus;
  previousDispatchCode: string | null;
  newDispatchCode: string | null;
};

export type RpiVersionComparison = {
  addedCount: number;
  removedCount: number;
  changedCount: number;
  details: ComparisonDetailEntry[];
};

export type PreviousPublicationRef = { processNumber: string; dispatchCode: string | null };
export type NewPublicationRef = { processNumber: string; dispatchCode: string | null };

/**
 * Compara as publicacoes da versao anterior de uma edicao da RPI com as da
 * nova versao (secao 6: "RPI corrigida e duplicidade"). Nunca decide
 * sozinho se a substituicao deve ocorrer -- apenas produz o diff para que
 * o profissional responsavel revise e confirme antes da importacao.
 */
export function compareRpiVersions(
  previousPublications: PreviousPublicationRef[],
  newPublications: NewPublicationRef[],
): RpiVersionComparison {
  const previousByProcess = new Map(previousPublications.map((p) => [p.processNumber, p]));
  const newByProcess = new Map(newPublications.map((p) => [p.processNumber, p]));

  const details: ComparisonDetailEntry[] = [];

  for (const [processNumber, newPub] of newByProcess) {
    const previousPub = previousByProcess.get(processNumber);
    if (!previousPub) {
      details.push({
        processNumber,
        status: "ADICIONADA",
        previousDispatchCode: null,
        newDispatchCode: newPub.dispatchCode,
      });
    } else if (previousPub.dispatchCode !== newPub.dispatchCode) {
      details.push({
        processNumber,
        status: "ALTERADA",
        previousDispatchCode: previousPub.dispatchCode,
        newDispatchCode: newPub.dispatchCode,
      });
    }
  }

  for (const [processNumber, previousPub] of previousByProcess) {
    if (!newByProcess.has(processNumber)) {
      details.push({
        processNumber,
        status: "REMOVIDA",
        previousDispatchCode: previousPub.dispatchCode,
        newDispatchCode: null,
      });
    }
  }

  return {
    addedCount: details.filter((d) => d.status === "ADICIONADA").length,
    removedCount: details.filter((d) => d.status === "REMOVIDA").length,
    changedCount: details.filter((d) => d.status === "ALTERADA").length,
    details,
  };
}
