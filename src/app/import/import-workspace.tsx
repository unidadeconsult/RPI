"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";

type ComparisonDetailEntry = {
  processNumber: string;
  status: "ADICIONADA" | "REMOVIDA" | "ALTERADA";
  previousDispatchCode: string | null;
  newDispatchCode: string | null;
};

type RpiVersionComparison = {
  addedCount: number;
  removedCount: number;
  changedCount: number;
  details: ComparisonDetailEntry[];
};

type PreviewResponse = {
  fileName: string;
  fileSizeBytes: number;
  detectedRpiNumber: string | null;
  totalRecords: number;
  totalConfirmados: number;
  totalDuvidosos: number;
  totalConfirmadosPe: number;
  totalLocalizacaoNaoConfirmada: number;
  confirmados: Array<{
    processNumber: string;
    trademarkName: string | null;
    holders: string[];
    peStatus: string;
    matchStatus: string;
  }>;
  previousEditionComparison: RpiVersionComparison | null;
};

type ConfirmResponse = {
  status: "IMPORTADO";
  rpiEditionId: string;
  isCorrection: boolean;
  totalRecordsParsed: number;
  totalConfirmados: number;
  totalDuvidosos: number;
  totalConfirmadosPe: number;
  totalLocalizacaoNaoConfirmada: number;
  totalCodigosDesconhecidos: number;
  publicationsSkippedAsDuplicate: number;
};

type FileStatus =
  | "ANALISANDO"
  | "PRE_VISUALIZADO"
  | "IMPORTANDO"
  | "IMPORTADO"
  | "DUPLICADO"
  | "ERRO";

type ManagedFile = {
  id: string;
  file: File;
  status: FileStatus;
  preview?: PreviewResponse;
  rpiNumber: string;
  rpiDate: string;
  error?: string;
  result?: ConfirmResponse;
  correctionReviewed: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportWorkspace({ canConfirm }: { canConfirm: boolean }) {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const runPreview = useCallback(async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    let response: Response;
    try {
      response = await fetch("/api/import/apol/preview", { method: "POST", body: formData });
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: "ERRO",
                error: "Falha de rede ao enviar o arquivo. Verifique sua conexão e tente novamente.",
              }
            : f,
        ),
      );
      return;
    }

    let data: { error?: string; detectedRpiNumber?: string | null } | undefined;
    try {
      data = await response.json();
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: "ERRO",
                error: `O servidor não respondeu corretamente (HTTP ${response.status}). Se o arquivo for grande, a importação pode ter demorado além do tempo limite — tente novamente.`,
              }
            : f,
        ),
      );
      return;
    }

    if (!response.ok) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "ERRO", error: data?.error ?? `Erro ao processar o arquivo (HTTP ${response.status}).` }
            : f,
        ),
      );
      return;
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status: "PRE_VISUALIZADO",
              preview: data as unknown as PreviewResponse,
              rpiNumber: data?.detectedRpiNumber ?? "",
            }
          : f,
      ),
    );
  }, []);

  const addFiles = useCallback(
    (fileList: FileList) => {
      const newEntries: ManagedFile[] = [...fileList].map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        status: "ANALISANDO" as const,
        rpiNumber: "",
        rpiDate: "",
        correctionReviewed: false,
      }));

      setFiles((prev) => [...prev, ...newEntries]);
      for (const entry of newEntries) {
        void runPreview(entry.id, entry.file);
      }
    },
    [runPreview],
  );

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  }

  function updateField(id: string, field: "rpiNumber" | "rpiDate", value: string) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  }

  function toggleCorrectionReviewed(id: string, checked: boolean) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, correctionReviewed: checked } : f)));
  }

  async function confirmImport(managed: ManagedFile) {
    setFiles((prev) => prev.map((f) => (f.id === managed.id ? { ...f, status: "IMPORTANDO" } : f)));

    const formData = new FormData();
    formData.append("file", managed.file);
    formData.append("rpiNumber", managed.rpiNumber);
    formData.append("rpiDate", managed.rpiDate);

    let response: Response;
    try {
      response = await fetch("/api/import/apol/confirm", { method: "POST", body: formData });
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === managed.id
            ? {
                ...f,
                status: "ERRO",
                error: "Falha de rede ao confirmar a importação. Verifique sua conexão e tente novamente.",
              }
            : f,
        ),
      );
      return;
    }

    let data: { error?: string } | undefined;
    try {
      data = await response.json();
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === managed.id
            ? {
                ...f,
                status: "ERRO",
                error: `O servidor não respondeu corretamente (HTTP ${response.status}). Se o arquivo for grande, a importação pode ter demorado além do tempo limite — tente novamente.`,
              }
            : f,
        ),
      );
      return;
    }

    if (response.status === 409) {
      setFiles((prev) =>
        prev.map((f) => (f.id === managed.id ? { ...f, status: "DUPLICADO", error: data?.error } : f)),
      );
      return;
    }

    if (!response.ok) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === managed.id
            ? { ...f, status: "ERRO", error: data?.error ?? `Erro ao confirmar a importação (HTTP ${response.status}).` }
            : f,
        ),
      );
      return;
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === managed.id ? { ...f, status: "IMPORTADO", result: data as unknown as ConfirmResponse } : f,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900"
      >
        <p className="font-medium">Arraste o PDF da RPI aqui ou clique para selecionar</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Formato aceito nesta versão: PDF (relatório APOL). Vários arquivos podem ser
          enviados de uma vez.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      <div className="flex flex-col gap-4">
        {files.map((managed) => (
          <FileCard
            key={managed.id}
            managed={managed}
            canConfirm={canConfirm}
            onFieldChange={updateField}
            onConfirm={confirmImport}
            onCorrectionReviewedChange={toggleCorrectionReviewed}
          />
        ))}
      </div>
    </div>
  );
}

function FileCard({
  managed,
  canConfirm,
  onFieldChange,
  onConfirm,
  onCorrectionReviewedChange,
}: {
  managed: ManagedFile;
  canConfirm: boolean;
  onFieldChange: (id: string, field: "rpiNumber" | "rpiDate", value: string) => void;
  onConfirm: (managed: ManagedFile) => void;
  onCorrectionReviewedChange: (id: string, checked: boolean) => void;
}) {
  const comparison = managed.preview?.previousEditionComparison ?? null;
  const requiresCorrectionReview = comparison !== null;
  const hasComparisonChanges =
    comparison !== null &&
    (comparison.addedCount > 0 || comparison.removedCount > 0 || comparison.changedCount > 0);
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{managed.file.name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatBytes(managed.file.size)}
          </p>
        </div>
        <StatusBadge status={managed.status} />
      </div>

      {managed.status === "ANALISANDO" && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Lendo o arquivo e localizando publicações de JANE GLAUCIA VIEIRA...
        </p>
      )}

      {managed.error && (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {managed.error}
        </p>
      )}

      {managed.preview && managed.status !== "IMPORTADO" && (
        <div className="mt-4 flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <SummaryStat label="Total de publicações" value={managed.preview.totalRecords} />
            <SummaryStat
              label="Jane como procuradora"
              value={managed.preview.totalConfirmados}
              highlight
            />
            <SummaryStat label="Duvidosas (revisar)" value={managed.preview.totalDuvidosos} />
            <SummaryStat label="Localização confirmada /PE" value={managed.preview.totalConfirmadosPe} />
            <SummaryStat
              label="Localização não confirmada"
              value={managed.preview.totalLocalizacaoNaoConfirmada}
            />
          </dl>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Número da RPI
              <input
                type="text"
                value={managed.rpiNumber}
                onChange={(e) => onFieldChange(managed.id, "rpiNumber", e.target.value)}
                className="field"
                placeholder="ex.: 2888"
              />
              {managed.preview.detectedRpiNumber && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Detectado automaticamente — confira antes de confirmar.
                </span>
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data de publicação da RPI
              <input
                type="date"
                value={managed.rpiDate}
                onChange={(e) => onFieldChange(managed.id, "rpiDate", e.target.value)}
                className="field"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                O arquivo não declara a data oficial — informe manualmente.
              </span>
            </label>
          </div>

          {comparison && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Esta RPI já foi importada antes — possível versão corrigida.
              </p>
              {hasComparisonChanges ? (
                <>
                  <p className="mt-1 text-amber-800 dark:text-amber-300">
                    {comparison.addedCount} publicação(ões) incluída(s), {comparison.removedCount}{" "}
                    removida(s), {comparison.changedCount} alterada(s) em relação à versão anterior.
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium text-amber-900 dark:text-amber-200">
                      Ver diferenças
                    </summary>
                    <ul className="mt-2 flex flex-col gap-1 text-xs">
                      {comparison.details.map((d) => (
                        <li key={`${d.processNumber}-${d.status}`}>
                          <span className="font-medium">{d.processNumber}</span> — {d.status}
                          {d.status === "ALTERADA" &&
                            ` (${d.previousDispatchCode ?? "—"} → ${d.newDispatchCode ?? "—"})`}
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              ) : (
                <p className="mt-1 text-amber-800 dark:text-amber-300">
                  Nenhuma diferença encontrada em relação à versão anterior.
                </p>
              )}
              <label className="mt-3 flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
                <input
                  type="checkbox"
                  checked={managed.correctionReviewed}
                  onChange={(e) => onCorrectionReviewedChange(managed.id, e.target.checked)}
                />
                Revisei as diferenças e confirmo a substituição dos dados da versão anterior.
              </label>
            </div>
          )}

          {managed.preview.confirmados.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                Ver publicações encontradas ({managed.preview.confirmados.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-2">
                {managed.preview.confirmados.map((pub) => (
                  <li
                    key={pub.processNumber}
                    className="rounded-md border border-slate-200 p-2 dark:border-slate-800"
                  >
                    <span className="font-medium">{pub.processNumber}</span>
                    {pub.trademarkName && <> — {pub.trademarkName}</>}
                    <br />
                    <span className="text-slate-500 dark:text-slate-400">
                      {pub.holders.join(" / ")}
                    </span>
                    {pub.matchStatus === "DUVIDOSO_REVISAR" && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        VÍNCULO NÃO CONFIRMADO — REVISAR
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {canConfirm ? (
            <button
              type="button"
              disabled={
                managed.status === "IMPORTANDO" ||
                managed.rpiNumber.trim() === "" ||
                managed.rpiDate.trim() === "" ||
                (requiresCorrectionReview && !managed.correctionReviewed)
              }
              onClick={() => onConfirm(managed)}
              className="self-start btn-primary disabled:opacity-50"
            >
              {managed.status === "IMPORTANDO" ? "Importando..." : "Confirmar importação"}
            </button>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Apenas o perfil Administrador pode confirmar a importação.
            </p>
          )}
        </div>
      )}

      {managed.status === "IMPORTADO" && managed.result && (
        <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Importação concluída{managed.result.isCorrection ? " (versão corrigida desta RPI)" : ""}.{" "}
          {managed.result.totalConfirmados} publicação(ões) confirmada(s) com Jane como
          procuradora, {managed.result.totalDuvidosos} duvidosa(s).
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 p-2 dark:border-slate-800">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-lg font-semibold ${highlight ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  const labels: Record<FileStatus, string> = {
    ANALISANDO: "Analisando",
    PRE_VISUALIZADO: "Pronto para revisar",
    IMPORTANDO: "Importando",
    IMPORTADO: "Importado",
    DUPLICADO: "Duplicado",
    ERRO: "Erro",
  };
  const colors: Record<FileStatus, string> = {
    ANALISANDO: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    PRE_VISUALIZADO: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    IMPORTANDO: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    IMPORTADO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    DUPLICADO: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    ERRO: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}
