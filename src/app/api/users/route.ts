import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson, requireAdmin } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import type { Role, User } from "@/lib/types";

export const runtime = "nodejs";

type CreateUserBody = {
  username?: string;
  password?: string;
  role?: Role;
  firstName?: string;
  lastName?: string;
  badgeId?: string;
  email?: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!requireAdmin(request)) {
    return jsonError("Nu ai acces la această zonă.", 403);
  }

  const rows = await prisma.user.findMany({
    orderBy: { username: "asc" }
  });

  const users: User[] = rows.map((row) => ({
    id: row.id,
    username: row.username,
    role: row.role,
    firstName: row.firstName,
    lastName: row.lastName,
    badgeId: row.badgeId,
    email: row.email
  }));

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!requireAdmin(request)) {
    return jsonError("Nu ai acces la această zonă.", 403);
  }

  const body = await readJson<CreateUserBody>(request);
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";
  const role = body.role ?? "User";

  if (!username || !password) {
    return jsonError("Completează username și parolă.");
  }

  try {
    await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        role,
        firstName: body.firstName?.trim() ?? "",
        lastName: body.lastName?.trim() ?? "",
        badgeId: body.badgeId?.trim() ?? "",
        email: body.email?.trim() ?? ""
      }
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return jsonError("Utilizatorul există deja.");
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
