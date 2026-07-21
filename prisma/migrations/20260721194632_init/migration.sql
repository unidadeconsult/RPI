-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMINISTRADOR', 'ANALISTA', 'CONSULTA');

-- CreateEnum
CREATE TYPE "RpiFileType" AS ENUM ('XML', 'ZIP', 'PDF');

-- CreateEnum
CREATE TYPE "ExtractionSource" AS ENUM ('XML_ESTRUTURADO', 'PDF_TEXTO', 'PDF_OCR');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NAO_REVISADO', 'REVISADO');

-- CreateEnum
CREATE TYPE "AttorneyMatchStatus" AS ENUM ('CONFIRMADO', 'DUVIDOSO_REVISAR');

-- CreateEnum
CREATE TYPE "PeStatus" AS ENUM ('NAO_APLICAVEL', 'CONFIRMADO_PE', 'CONFIRMADO_OUTRO_ESTADO', 'NAO_CONFIRMADO_REVISAR');

-- CreateEnum
CREATE TYPE "DispatchCategory" AS ENUM ('DEFERIMENTO', 'PUBLICACAO', 'OPOSICAO', 'NULIDADE', 'CADUCIDADE', 'INDEFERIMENTO', 'ARQUIVAMENTO', 'OUTROS_NAO_CLASSIFICADO');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "DeadlineCountingType" AS ENUM ('CORRIDOS', 'UTEIS');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('SUGERIDO_CONFERIR', 'CONFIRMADO', 'VENCIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PartyRole" AS ENUM ('TITULAR', 'REQUERENTE', 'DEPOSITANTE', 'INTERESSADO', 'OUTRO');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('PF', 'PJ');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOVO', 'EM_CONFERENCIA', 'PROVIDENCIA_DEFINIDA', 'AGUARDANDO_CLIENTE', 'EM_EXECUCAO', 'AGUARDANDO_PAGAMENTO', 'PROTOCOLADO', 'CONCLUIDO', 'SEM_PROVIDENCIA', 'CANCELADO');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PROCURACAO', 'CONTRATO_SOCIAL', 'PARECER', 'PETICAO', 'OPOSICAO', 'MANIFESTACAO', 'RECURSO', 'BOLETO', 'COMPROVANTE_PAGAMENTO', 'PROTOCOLO', 'EVIDENCIA_USO', 'CERTIFICADO', 'EMAIL', 'DIVERSO');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ATIVO', 'SUBSTITUIDO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'INTERNO');

-- CreateEnum
CREATE TYPE "MessageTemplateCategory" AS ENUM ('COMUNICACAO_PUBLICACAO', 'COMUNICACAO_OPOSICAO', 'COMUNICACAO_DEFERIMENTO', 'COBRANCA_PAGAMENTO', 'PEDIDO_DOCUMENTOS', 'PEDIDO_PROVAS_USO', 'COMUNICACAO_INDEFERIMENTO', 'ACOMPANHAMENTO_PRAZO', 'LEMBRETE_INTERNO', 'CONCLUSAO_PROCEDIMENTO');

-- CreateEnum
CREATE TYPE "MessageDraftStatus" AS ENUM ('RASCUNHO', 'ENVIADO_MANUALMENTE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('PRAZO', 'TAREFA', 'PAGAMENTO', 'REUNIAO', 'SOLICITACAO_CLIENTE', 'MANIFESTACAO', 'RECURSO', 'EXIGENCIA', 'RENOVACAO', 'INTERNO');

-- CreateEnum
CREATE TYPE "SimilarityMatchType" AS ENUM ('IDENTICA', 'ALTA', 'MEDIA', 'BAIXA', 'REVISAR');

-- CreateEnum
CREATE TYPE "SimilarityStatus" AS ENUM ('NOVO', 'RELEVANTE', 'FALSO_POSITIVO');

-- CreateEnum
CREATE TYPE "ImportErrorSeverity" AS ENUM ('ERRO', 'AVISO');

-- CreateEnum
CREATE TYPE "RpiEditionStatus" AS ENUM ('IMPORTADA', 'SUBSTITUIDA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "RoleName" NOT NULL DEFAULT 'CONSULTA',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpi_editions" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "publicationDate" TIMESTAMP(3) NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'Marcas',
    "status" "RpiEditionStatus" NOT NULL DEFAULT 'IMPORTADA',
    "versionLabel" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "importedById" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "rpi_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpi_files" (
    "id" TEXT NOT NULL,
    "rpiEditionId" TEXT NOT NULL,
    "fileType" "RpiFileType" NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "containedInZip" BOOLEAN NOT NULL DEFAULT false,
    "ocrUsed" BOOLEAN NOT NULL DEFAULT false,
    "textExtractable" BOOLEAN,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rpi_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpi_edition_comparisons" (
    "id" TEXT NOT NULL,
    "previousEditionId" TEXT NOT NULL,
    "newEditionId" TEXT NOT NULL,
    "addedCount" INTEGER NOT NULL,
    "removedCount" INTEGER NOT NULL,
    "changedCount" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rpi_edition_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proceedings" (
    "id" TEXT NOT NULL,
    "processNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proceedings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trademarks" (
    "id" TEXT NOT NULL,
    "proceedingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "presentationType" TEXT,
    "nature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trademarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trademark_classes" (
    "id" TEXT NOT NULL,
    "trademarkId" TEXT NOT NULL,
    "niceClass" TEXT NOT NULL,
    "specificationText" TEXT,

    CONSTRAINT "trademark_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "proceedingId" TEXT NOT NULL,
    "role" "PartyRole" NOT NULL,
    "name" TEXT NOT NULL,
    "cpfCnpj" TEXT,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorneys" (
    "id" TEXT NOT NULL,
    "nameRaw" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attorneys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_name_aliases" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "aliasRaw" TEXT NOT NULL,
    "aliasNormalized" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attorney_name_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_attorneys" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "isTargetMatch" BOOLEAN NOT NULL DEFAULT false,
    "matchStatus" "AttorneyMatchStatus",
    "confidenceLevel" "ConfidenceLevel",
    "sourceFieldTag" TEXT,
    "sourceExcerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_attorneys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "officialDescription" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_rules" (
    "id" TEXT NOT NULL,
    "dispatchCodeId" TEXT NOT NULL,
    "mainCategory" "DispatchCategory" NOT NULL DEFAULT 'OUTROS_NAO_CLASSIFICADO',
    "subcategory" TEXT,
    "suggestedProvidence" TEXT,
    "urgencyLevel" "UrgencyLevel" NOT NULL DEFAULT 'MEDIA',
    "hasDeadline" BOOLEAN NOT NULL DEFAULT false,
    "deadlineRuleDescription" TEXT,
    "requiredDocuments" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "dispatch_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "rpiEditionId" TEXT NOT NULL,
    "rpiFileId" TEXT NOT NULL,
    "publicationHash" TEXT NOT NULL,
    "proceedingId" TEXT,
    "processNumberRaw" TEXT,
    "dispatchCodeId" TEXT,
    "dispatchDescriptionRaw" TEXT,
    "category" "DispatchCategory" NOT NULL DEFAULT 'OUTROS_NAO_CLASSIFICADO',
    "subcategory" TEXT,
    "categoryIsUnknownCode" BOOLEAN NOT NULL DEFAULT false,
    "locationRaw" TEXT,
    "locationUf" TEXT,
    "peStatus" "PeStatus" NOT NULL DEFAULT 'NAO_APLICAVEL',
    "peSourceExcerpt" TEXT,
    "sourceExcerpt" TEXT,
    "sourceStructureRaw" TEXT,
    "pdfPageNumber" INTEGER,
    "extractionSource" "ExtractionSource" NOT NULL,
    "confidenceLevel" "ConfidenceLevel" NOT NULL,
    "confidenceReason" TEXT,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NAO_REVISADO',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "suggestedProvidence" TEXT,
    "definedProvidence" TEXT,
    "responsibleUserId" TEXT,
    "priority" "UrgencyLevel",
    "notes" TEXT,
    "importedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "previousVersionId" TEXT,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deadlines" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "proceedingId" TEXT NOT NULL,
    "eventLabel" TEXT NOT NULL,
    "publicationDate" TIMESTAMP(3) NOT NULL,
    "daysConfigured" INTEGER,
    "countingType" "DeadlineCountingType",
    "suggestedDate" TIMESTAMP(3),
    "dispatchRuleUsedId" TEXT,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'SUGERIDO_CONFERIR',
    "confirmedDate" TIMESTAMP(3),
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "internalDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personType" "PersonType" NOT NULL,
    "cpfCnpj" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "internalResponsibleId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_processes" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proceedingId" TEXT NOT NULL,
    "trademarkId" TEXT,
    "responsibleUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "proceedingId" TEXT,
    "clientId" TEXT,
    "publicationId" TEXT,
    "providenceSuggested" TEXT,
    "providenceDefined" TEXT,
    "responsibleUserId" TEXT,
    "reviewerUserId" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIA',
    "internalDueDate" TIMESTAMP(3),
    "deadlineId" TEXT,
    "checklist" JSONB,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "proceedingId" TEXT,
    "clientId" TEXT,
    "publicationId" TEXT,
    "taskId" TEXT,
    "description" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "origin" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ATIVO',
    "filePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "changeNote" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "category" "MessageTemplateCategory" NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_drafts" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "channel" "MessageChannel" NOT NULL,
    "recipient" TEXT,
    "clientId" TEXT,
    "body" TEXT NOT NULL,
    "status" "MessageDraftStatus" NOT NULL DEFAULT 'RASCUNHO',
    "version" INTEGER NOT NULL DEFAULT 1,
    "preparedById" TEXT,
    "preparedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentConfirmedById" TEXT,
    "sentConfirmedAt" TIMESTAMP(3),

    CONSTRAINT "message_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "proceedingId" TEXT,
    "clientId" TEXT,
    "taskId" TEXT,
    "deadlineId" TEXT,
    "publicationId" TEXT,
    "responsibleUserId" TEXT,
    "priority" "TaskPriority",
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitored_trademarks" (
    "id" TEXT NOT NULL,
    "mainExpression" TEXT NOT NULL,
    "relevantWords" TEXT[],
    "variations" TEXT[],
    "niceClasses" TEXT[],
    "titular" TEXT,
    "clientId" TEXT,
    "ignoredTerms" TEXT[],
    "minSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_trademarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "similarity_matches" (
    "id" TEXT NOT NULL,
    "monitoredTrademarkId" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "matchedTrademarkId" TEXT,
    "matchType" "SimilarityMatchType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "matchedTerm" TEXT,
    "niceClassMatch" BOOLEAN NOT NULL DEFAULT false,
    "titularDiffers" BOOLEAN NOT NULL DEFAULT true,
    "reasonDetails" TEXT,
    "status" "SimilarityStatus" NOT NULL DEFAULT 'NOVO',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "similarity_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "interpretedFilters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_errors" (
    "id" TEXT NOT NULL,
    "rpiFileId" TEXT NOT NULL,
    "severity" "ImportErrorSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rpi_editions_number_versionLabel_key" ON "rpi_editions"("number", "versionLabel");

-- CreateIndex
CREATE UNIQUE INDEX "rpi_files_fileHash_key" ON "rpi_files"("fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "proceedings_processNumber_key" ON "proceedings"("processNumber");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_codes_code_key" ON "dispatch_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_rules_dispatchCodeId_key" ON "dispatch_rules"("dispatchCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "publications_publicationHash_key" ON "publications"("publicationHash");

-- CreateIndex
CREATE UNIQUE INDEX "client_processes_clientId_proceedingId_key" ON "client_processes"("clientId", "proceedingId");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_versionNumber_key" ON "document_versions"("documentId", "versionNumber");

-- AddForeignKey
ALTER TABLE "rpi_editions" ADD CONSTRAINT "rpi_editions_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "rpi_editions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpi_editions" ADD CONSTRAINT "rpi_editions_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpi_files" ADD CONSTRAINT "rpi_files_rpiEditionId_fkey" FOREIGN KEY ("rpiEditionId") REFERENCES "rpi_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpi_files" ADD CONSTRAINT "rpi_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpi_edition_comparisons" ADD CONSTRAINT "rpi_edition_comparisons_previousEditionId_fkey" FOREIGN KEY ("previousEditionId") REFERENCES "rpi_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpi_edition_comparisons" ADD CONSTRAINT "rpi_edition_comparisons_newEditionId_fkey" FOREIGN KEY ("newEditionId") REFERENCES "rpi_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpi_edition_comparisons" ADD CONSTRAINT "rpi_edition_comparisons_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trademarks" ADD CONSTRAINT "trademarks_proceedingId_fkey" FOREIGN KEY ("proceedingId") REFERENCES "proceedings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trademark_classes" ADD CONSTRAINT "trademark_classes_trademarkId_fkey" FOREIGN KEY ("trademarkId") REFERENCES "trademarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_proceedingId_fkey" FOREIGN KEY ("proceedingId") REFERENCES "proceedings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_name_aliases" ADD CONSTRAINT "attorney_name_aliases_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_name_aliases" ADD CONSTRAINT "attorney_name_aliases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_attorneys" ADD CONSTRAINT "publication_attorneys_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_attorneys" ADD CONSTRAINT "publication_attorneys_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_rules" ADD CONSTRAINT "dispatch_rules_dispatchCodeId_fkey" FOREIGN KEY ("dispatchCodeId") REFERENCES "dispatch_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_rules" ADD CONSTRAINT "dispatch_rules_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_rpiEditionId_fkey" FOREIGN KEY ("rpiEditionId") REFERENCES "rpi_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_rpiFileId_fkey" FOREIGN KEY ("rpiFileId") REFERENCES "rpi_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_proceedingId_fkey" FOREIGN KEY ("proceedingId") REFERENCES "proceedings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_dispatchCodeId_fkey" FOREIGN KEY ("dispatchCodeId") REFERENCES "dispatch_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "publications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_proceedingId_fkey" FOREIGN KEY ("proceedingId") REFERENCES "proceedings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_internalResponsibleId_fkey" FOREIGN KEY ("internalResponsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_processes" ADD CONSTRAINT "client_processes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_processes" ADD CONSTRAINT "client_processes_proceedingId_fkey" FOREIGN KEY ("proceedingId") REFERENCES "proceedings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_processes" ADD CONSTRAINT "client_processes_trademarkId_fkey" FOREIGN KEY ("trademarkId") REFERENCES "trademarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_processes" ADD CONSTRAINT "client_processes_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_proceedingId_fkey" FOREIGN KEY ("proceedingId") REFERENCES "proceedings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "deadlines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_proceedingId_fkey" FOREIGN KEY ("proceedingId") REFERENCES "proceedings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_drafts" ADD CONSTRAINT "message_drafts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_drafts" ADD CONSTRAINT "message_drafts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_drafts" ADD CONSTRAINT "message_drafts_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_drafts" ADD CONSTRAINT "message_drafts_sentConfirmedById_fkey" FOREIGN KEY ("sentConfirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_proceedingId_fkey" FOREIGN KEY ("proceedingId") REFERENCES "proceedings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "deadlines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitored_trademarks" ADD CONSTRAINT "monitored_trademarks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitored_trademarks" ADD CONSTRAINT "monitored_trademarks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_matches" ADD CONSTRAINT "similarity_matches_monitoredTrademarkId_fkey" FOREIGN KEY ("monitoredTrademarkId") REFERENCES "monitored_trademarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_matches" ADD CONSTRAINT "similarity_matches_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_matches" ADD CONSTRAINT "similarity_matches_matchedTrademarkId_fkey" FOREIGN KEY ("matchedTrademarkId") REFERENCES "trademarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_matches" ADD CONSTRAINT "similarity_matches_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_errors" ADD CONSTRAINT "import_errors_rpiFileId_fkey" FOREIGN KEY ("rpiFileId") REFERENCES "rpi_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
