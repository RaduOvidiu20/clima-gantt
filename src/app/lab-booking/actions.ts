"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/http";
import { cookies } from "next/headers";
import { decode, COOKIE_NAME } from "@/lib/session";

async function getSession() {
  const cookieStore = await cookies();
  return decode(cookieStore.get(COOKIE_NAME)?.value);
}

function hasPermission(session: any, perm: string) {
  if (!session) return false;
  if (session.role === "Admin") return true;
  return session.permissions?.includes(perm) ?? false;
}

export async function createLabTask(data: {
  title: string;
  description: string;
  deadline: string;
  priority: string;
  specialRequest?: string;
}) {
  const session = await getSession();
  if (!hasPermission(session, "lab_create")) {
    throw new Error("Nu ai permisiunea de a crea taskuri.");
  }

  const task = await prisma.$transaction(async (tx) => {
    const t = await tx.labTask.create({
      data: {
        title: data.title,
        description: data.description,
        deadline: new Date(data.deadline),
        priority: data.priority,
        specialRequest: data.specialRequest,
        status: "Nepreluat",
        creatorId: session!.id,
      }
    });
    
    await tx.labTaskHistory.create({
      data: {
        taskId: t.id,
        userId: session!.id,
        action: "Creat",
        changes: null
      }
    });
    
    return t;
  });

  revalidatePath("/lab-booking");
  return task;
}

export async function takeLabTask(id: string) {
  const session = await getSession();
  if (!hasPermission(session, "lab_engineer")) {
    throw new Error("Nu ai permisiunea de a prelua taskuri.");
  }

  const task = await prisma.labTask.findUnique({ where: { id } });
  if (!task || task.status !== "Nepreluat") {
    throw new Error("Taskul nu mai este disponibil pentru preluare.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.labTask.update({
      where: { id },
      data: {
        assigneeId: session!.id,
        status: "In lucru"
      }
    });

    await tx.labTaskHistory.create({
      data: {
        taskId: id,
        userId: session!.id,
        action: "Preluat",
        changes: "Status schimbat in 'In lucru'"
      }
    });
  });

  revalidatePath("/lab-booking");
}

export async function updateLabTask(id: string, patch: any) {
  const session = await getSession();
  if (!session) throw new Error("Neautentificat");

  const task = await prisma.labTask.findUnique({ where: { id } });
  if (!task) throw new Error("Task indisponibil");

  const isAdmin = hasPermission(session, "admin");
  const isAssignee = task.assigneeId === session.id;

  if (!isAdmin && !isAssignee) {
    throw new Error("Nu poți edita acest task.");
  }

  const allowedData: any = {};
  const changesList: string[] = [];
  
  if (patch.description !== undefined && patch.description !== task.description) {
    allowedData.description = patch.description;
    changesList.push("Descriere");
  }
  if (patch.specialRequest !== undefined && patch.specialRequest !== task.specialRequest) {
    allowedData.specialRequest = patch.specialRequest;
    changesList.push("Cerinte speciale");
  }
  if (patch.status !== undefined && patch.status !== task.status) {
    allowedData.status = patch.status;
    changesList.push(`Status (${task.status} -> ${patch.status})`);
  }
  if (patch.priority !== undefined && patch.priority !== task.priority) {
    allowedData.priority = patch.priority;
    changesList.push(`Prioritate (${task.priority} -> ${patch.priority})`);
  }
  if (patch.deadline !== undefined) {
    const newDate = new Date(patch.deadline);
    if (newDate.getTime() !== task.deadline.getTime()) {
      allowedData.deadline = newDate;
      changesList.push("Deadline");
    }
  }
  
  if (Object.keys(allowedData).length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.labTask.update({
        where: { id },
        data: allowedData
      });
      
      await tx.labTaskHistory.create({
        data: {
          taskId: id,
          userId: session.id,
          action: "Editat",
          changes: `Modificari: ${changesList.join(", ")}`
        }
      });
    });
  }

  revalidatePath("/lab-booking");
}

export async function cancelLabTask(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Neautentificat");

  const task = await prisma.labTask.findUnique({ where: { id } });
  if (!task) throw new Error("Task indisponibil");

  const isAdmin = hasPermission(session, "admin");
  const isCreator = task.creatorId === session.id;

  if (!isAdmin && !isCreator) {
    throw new Error("Doar creatorul sau un admin pot anula acest task.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.labTask.update({
      where: { id },
      data: { status: "Canceled" }
    });
    
    await tx.labTaskHistory.create({
      data: {
        taskId: id,
        userId: session.id,
        action: "Anulat",
        changes: null
      }
    });
  });

  revalidatePath("/lab-booking");
}

export async function getLabTaskHistory(taskId: string) {
  const session = await getSession();
  if (!session) throw new Error("Neautentificat");
  
  const history = await prisma.labTaskHistory.findMany({
    where: { taskId },
    include: {
      user: {
        select: { firstName: true, lastName: true, username: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  
  return history;
}
