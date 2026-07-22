import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { jsonError, readJson, requireAdmin } from "@/lib/http";
import { Permission, UserRole } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionUser = requireAdmin(request);
  if (!sessionUser) {
    return jsonError("Forbidden", 403);
  }

  const roles = await prisma.userRole.findMany({
    orderBy: { name: "asc" }
  });

  return NextResponse.json({
    roles: roles.map(r => ({
      name: r.name,
      permissions: r.permissions as Permission[]
    }))
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessionUser = requireAdmin(request);
  if (!sessionUser) {
    return jsonError("Forbidden", 403);
  }

  const body = await readJson<Partial<UserRole>>(request);
  const name = body.name?.trim();
  const permissions = body.permissions || [];

  if (!name) {
    return jsonError("Numele rolului este obligatoriu.");
  }

  const role = await prisma.userRole.upsert({
    where: { name },
    update: { permissions },
    create: { name, permissions }
  });

  return NextResponse.json({ role });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const sessionUser = requireAdmin(request);
  if (!sessionUser) {
    return jsonError("Forbidden", 403);
  }

  const name = request.nextUrl.searchParams.get("name");
  if (!name || name === "Admin") {
    return jsonError("Rolul invalid sau protejat.");
  }

  // Nu ștergem dacă sunt useri asignați
  const userCount = await prisma.user.count({ where: { role: name } });
  if (userCount > 0) {
    return jsonError(`Rolul este folosit de ${userCount} utilizatori.`);
  }

  await prisma.userRole.delete({ where: { name } });
  return NextResponse.json({ success: true });
}
