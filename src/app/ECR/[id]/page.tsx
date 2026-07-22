import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isDbConfigured } from "@/lib/db-status";
import { SetupNotice } from "@/components/SetupNotice";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import { ProjectHeader } from "@/components/ProjectHeader";
import type { TestRow } from "@/lib/types";
import type { DurationUnit } from "@/lib/schedule";
import { cookies } from "next/headers";
import { decode, COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isDbConfigured()) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <SetupNotice />
      </main>
    );
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: { tests: { orderBy: { order: "asc" } } },
  });

  if (!project) notFound();

  const tests: TestRow[] = project.tests.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    order: t.order,
    name: t.name,
    description: t.description,
    durationVal: t.durationVal,
    durationUnit: (t.durationUnit as DurationUnit) ?? "h",
    note: t.note,
    status: t.status,
    equipment: t.equipment,
    parallel: t.parallel,
  }));
  
  const cookieStore = await cookies();
  const session = decode(cookieStore.get(COOKIE_NAME)?.value);
  const canEdit = session ? (session.permissions ? session.permissions.includes("gantt_edit") : session.role === "Admin") : false;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <ProjectHeader
        id={project.id}
        name={project.name}
        number={project.number}
        canEdit={canEdit}
      />
      <ProjectWorkspace projectId={project.id} initialTests={tests} canEdit={canEdit} />
    </main>
  );
}
