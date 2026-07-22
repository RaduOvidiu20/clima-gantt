import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson, requireAdmin } from "@/lib/http";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

type UpdateUserBody = {
  username?: string;
  firstName?: string;
  lastName?: string;
  badgeId?: string;
  email?: string;
  role?: Role;
};

async function getId(context: Params): Promise<number | null> {
  const { id } = await context.params;
  const value = Number(id);
  return Number.isInteger(value) ? value : null;
}

export async function PATCH(
  request: NextRequest,
  context: Params
): Promise<NextResponse> {
  if (!requireAdmin(request)) {
    return jsonError("Nu ai acces la această zonă.", 403);
  }

  const id = await getId(context);
  if (!id) return jsonError("Utilizator invalid.");

  const body = await readJson<UpdateUserBody>(request);

  const data: any = {};
  if (body.username !== undefined) data.username = body.username.trim() || undefined;
  if (body.firstName !== undefined) data.firstName = body.firstName.trim();
  if (body.lastName !== undefined) data.lastName = body.lastName.trim();
  if (body.badgeId !== undefined) data.badgeId = body.badgeId.trim();
  if (body.email !== undefined) data.email = body.email.trim();
  if (body.role !== undefined) data.role = body.role;

  try {
    await prisma.user.update({
      where: { id },
      data
    });
  } catch (error) {
    return jsonError("Eroare la actualizarea utilizatorului.");
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  context: Params
): Promise<NextResponse> {
  const admin = requireAdmin(request);
  if (!admin) {
    return jsonError("Nu ai acces la această zonă.", 403);
  }

  const id = await getId(context);
  if (!id) return jsonError("Utilizator invalid.");

  if (id === admin.id) {
    return jsonError("Nu poți șterge utilizatorul cu care ești autentificat.");
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    return jsonError("Eroare la ștergerea utilizatorului.");
  }

  return NextResponse.json({ ok: true });
}
