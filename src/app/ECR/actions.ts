"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { TestPatch } from "@/lib/types";

// ---- Proiecte -------------------------------------------------------------

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const number = String(formData.get("number") ?? "").trim();
  if (!name) return;
  const project = await prisma.project.create({
    data: { name, number: number || null },
  });
  revalidatePath("/ECR");
  redirect(`/ECR/${project.id}`);
}

export async function updateProject(
  id: string,
  patch: { name?: string; number?: string | null },
) {
  await prisma.project.update({ where: { id }, data: patch });
  revalidatePath("/ECR");
  revalidatePath(`/ECR/${id}`);
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/ECR");
}

// ---- Teste ----------------------------------------------------------------

export async function addTest(projectId: string) {
  const last = await prisma.test.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? -1) + 1;
  const test = await prisma.test.create({
    data: {
      projectId,
      order,
      name: `Test ${order + 1}`,
      durationVal: 1,
      durationUnit: "d",
    },
  });
  revalidatePath(`/ECR/${projectId}`);
  return test;
}

export async function updateTest(
  id: string,
  projectId: string,
  patch: TestPatch,
) {
  await prisma.test.update({ where: { id }, data: patch });
  revalidatePath(`/ECR/${projectId}`);
}

export async function deleteTest(id: string, projectId: string) {
  await prisma.test.delete({ where: { id } });
  revalidatePath(`/ECR/${projectId}`);
}

/** Mută un test în sus/jos schimbând `order` cu vecinul. */
export async function moveTest(
  id: string,
  projectId: string,
  direction: "up" | "down",
) {
  const tests = await prisma.test.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  const idx = tests.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= tests.length) return;

  const a = tests[idx];
  const b = tests[swapIdx];
  await prisma.$transaction([
    prisma.test.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.test.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath(`/ECR/${projectId}`);
}
