import Link from "next/link";
import { prisma } from "@/lib/db";
import { isDbConfigured } from "@/lib/db-status";
import { createProject } from "./actions";
import { SetupNotice } from "@/components/SetupNotice";
import { ProjectCard } from "@/components/ProjectCard";
import { cookies } from "next/headers";
import { decode, COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isDbConfigured()) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Header />
        <SetupNotice />
      </main>
    );
  }
  
  const cookieStore = await cookies();
  const session = decode(cookieStore.get(COOKIE_NAME)?.value);
  const canEdit = session ? (session.permissions ? session.permissions.includes("gantt_edit") : session.role === "Admin") : false;

  let projects: {
    id: string;
    name: string;
    number: string | null;
    _count: { tests: number };
  }[] = [];
  let error: string | null = null;
  try {
    projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tests: true } } },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <Header />

      {error ? (
        <SetupNotice detail={error} />
      ) : (
        <>
          {canEdit && (
            <form
              action={createProject}
              className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <label className="flex flex-col text-sm">
                <span className="mb-1 font-medium text-slate-600">Nr. proiect</span>
                <input
                  name="number"
                  placeholder="ex. P-2026-014"
                  className="w-40 rounded border border-slate-300 px-2 py-1.5"
                />
              </label>
              <label className="flex flex-1 flex-col text-sm">
                <span className="mb-1 font-medium text-slate-600">
                  Nume proiect *
                </span>
                <input
                  name="name"
                  required
                  placeholder="ex. Calificare senzor SPS"
                  className="w-full rounded border border-slate-300 px-2 py-1.5"
                />
              </label>
              <button
                type="submit"
                className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                + Proiect nou
              </button>
            </form>
          )}

          {projects.length === 0 ? (
            <p className="text-slate-500">
              Niciun proiect încă. Creează primul proiect mai sus.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <ProjectCard
                    id={p.id}
                    name={p.name}
                    number={p.number}
                    testsCount={p._count.tests}
                    canEdit={canEdit}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

function Header() {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gantt ECR</h1>
        <p className="text-sm text-slate-500">
          Planificator de teste pe echipamente — diagramă Gantt generată automat.
        </p>
      </div>
    </div>
  );
}
