import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { decode, COOKIE_NAME } from "@/lib/session";
import { LabBoard } from "./LabBoard";
import { SetupNotice } from "@/components/SetupNotice";
import { isDbConfigured } from "@/lib/db-status";

export const dynamic = "force-dynamic";

export default async function LabBookingPage() {
  if (!isDbConfigured()) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <SetupNotice />
      </main>
    );
  }

  const cookieStore = await cookies();
  const session = decode(cookieStore.get(COOKIE_NAME)?.value);

  if (!session || (!session.permissions?.includes("lab_view") && session.role !== "Admin")) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <p className="text-red-500">Nu ai permisiunea de a vizualiza această pagină.</p>
      </main>
    );
  }

  const isAdmin = session.role === "Admin" || session.permissions?.includes("admin");
  const isEngineer = session.permissions?.includes("lab_engineer");
  
  let tasks = await prisma.labTask.findMany({
    include: {
      creator: { select: { firstName: true, lastName: true, username: true } },
      assignee: { select: { firstName: true, lastName: true, username: true } },
    },
    orderBy: { createdAt: "desc" }
  });

  // Filtrare bazata pe logica ceruta:
  // - Admin vede tot.
  // - Inginerul vede nepreluatele (assigneeId === null) + ale lui (assigneeId === session.id). (Asta inseamna ca nu le vede pe ale altor ingineri, cum am agreat).
  // - Orice alt user (inclusiv creatorii simpli) isi vad doar taskurile create de ei. 
  // Daca un inginer este si creator, le vede pe ale lui (atat ca assignee cat si ca creator).

  if (!isAdmin) {
    if (isEngineer) {
      tasks = tasks.filter((t: any) => t.assigneeId === null || t.assigneeId === session.id || t.creatorId === session.id);
    } else {
      tasks = tasks.filter((t: any) => t.creatorId === session.id);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Laboratory Booking</h1>
        <p className="mt-2 text-slate-600">Gestionează și urmărește cererile de laborator.</p>
      </div>

      <LabBoard 
        initialTasks={tasks as any} 
        sessionUser={session as any} 
        isAdmin={isAdmin ?? false}
      />
    </main>
  );
}
