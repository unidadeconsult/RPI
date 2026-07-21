"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import type { TaskPriority, TaskStatus } from "@/generated/prisma/client";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/dashboard/task-labels";

function textOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Cria uma tarefa (secao 15). Pode nascer vinculada a uma publicacao
 * (e portanto a um processo e, se houver, ao cliente relacionado) ou
 * ser criada avulsa.
 */
export async function createTask(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const title = formData.get("title");
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("Título da tarefa é obrigatório.");
  }

  const publicationId = textOrNull(formData.get("publicationId"));
  const priorityRaw = formData.get("priority");
  const priority: TaskPriority = TASK_PRIORITIES.includes(priorityRaw as TaskPriority)
    ? (priorityRaw as TaskPriority)
    : "MEDIA";

  const internalDueDateRaw = textOrNull(formData.get("internalDueDate"));

  let proceedingId: string | null = null;
  let clientId: string | null = null;
  if (publicationId) {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
      include: { proceeding: { include: { clientProcesses: true } } },
    });
    proceedingId = publication?.proceedingId ?? null;
    clientId = publication?.proceeding?.clientProcesses[0]?.clientId ?? null;
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      proceedingId,
      clientId,
      publicationId,
      providenceSuggested: textOrNull(formData.get("providenceSuggested")),
      responsibleUserId: textOrNull(formData.get("responsibleUserId")) ?? user.id,
      reviewerUserId: textOrNull(formData.get("reviewerUserId")),
      priority,
      internalDueDate: internalDueDateRaw ? new Date(internalDueDateRaw) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE_TASK",
      entityType: "Task",
      entityId: task.id,
      newValue: { title: task.title, publicationId, proceedingId },
    },
  });

  revalidatePath("/tasks");
  if (publicationId) revalidatePath(`/publications/${publicationId}`);
  redirect(`/tasks/${task.id}`);
}

export async function updateTaskStatus(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const taskId = formData.get("taskId");
  const statusRaw = formData.get("status");
  if (typeof taskId !== "string" || !TASK_STATUSES.includes(statusRaw as TaskStatus)) {
    throw new Error("Dados inválidos.");
  }
  const status = statusRaw as TaskStatus;

  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });

  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { status } }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_TASK_STATUS",
        entityType: "Task",
        entityId: taskId,
        oldValue: { status: task.status },
        newValue: { status },
      },
    }),
  ]);

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
}

export async function updateTaskFields(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") throw new Error("taskId ausente");

  const priorityRaw = formData.get("priority");
  const priority: TaskPriority | undefined = TASK_PRIORITIES.includes(priorityRaw as TaskPriority)
    ? (priorityRaw as TaskPriority)
    : undefined;
  const internalDueDateRaw = textOrNull(formData.get("internalDueDate"));

  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });

  const data = {
    responsibleUserId: textOrNull(formData.get("responsibleUserId")),
    reviewerUserId: textOrNull(formData.get("reviewerUserId")),
    priority: priority ?? task.priority,
    internalDueDate: internalDueDateRaw ? new Date(internalDueDateRaw) : null,
    providenceDefined: textOrNull(formData.get("providenceDefined")),
  };

  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_TASK_FIELDS",
        entityType: "Task",
        entityId: taskId,
        newValue: data,
      },
    }),
  ]);

  revalidatePath(`/tasks/${taskId}`);
}

export async function addTaskComment(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const taskId = formData.get("taskId");
  const body = formData.get("body");
  if (typeof taskId !== "string" || typeof body !== "string" || body.trim() === "") {
    throw new Error("Comentário vazio.");
  }

  await prisma.taskComment.create({
    data: { taskId, userId: user.id, body: body.trim() },
  });

  revalidatePath(`/tasks/${taskId}`);
}

export async function toggleChecklistItem(formData: FormData) {
  await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const taskId = formData.get("taskId");
  const itemId = formData.get("itemId");
  if (typeof taskId !== "string" || typeof itemId !== "string") return;

  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const checklist = Array.isArray(task.checklist)
    ? (task.checklist as { id: string; text: string; done: boolean }[])
    : [];

  const updated = checklist.map((item) =>
    item.id === itemId ? { ...item, done: !item.done } : item,
  );

  await prisma.task.update({ where: { id: taskId }, data: { checklist: updated } });
  revalidatePath(`/tasks/${taskId}`);
}

export async function addChecklistItem(formData: FormData) {
  await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const taskId = formData.get("taskId");
  const text = formData.get("text");
  if (typeof taskId !== "string" || typeof text !== "string" || text.trim() === "") return;

  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const checklist = Array.isArray(task.checklist)
    ? (task.checklist as { id: string; text: string; done: boolean }[])
    : [];

  checklist.push({ id: crypto.randomUUID(), text: text.trim(), done: false });

  await prisma.task.update({ where: { id: taskId }, data: { checklist } });
  revalidatePath(`/tasks/${taskId}`);
}
