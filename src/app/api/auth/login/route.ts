import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import type { Permission, User } from "@/lib/types";

export const runtime = "nodejs";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await readJson<LoginBody>(request);
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return jsonError("Completează username și parolă.");
  }

  const row = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    include: { userRole: true }
  });

  if (!row || !verifyPassword(password, row.passwordHash)) {
    return jsonError("Username sau parolă incorectă.", 401);
  }

  const permissions = (row.userRole?.permissions as Permission[]) || [];

  const user: User = {
    id: row.id,
    username: row.username,
    role: row.role,
    firstName: row.firstName,
    lastName: row.lastName,
    badgeId: row.badgeId,
    email: row.email,
    permissions
  };

  const response = NextResponse.json({ user });
  setSessionCookie(response, {
    id: user.id,
    username: user.username,
    role: user.role,
    permissions
  });
  return response;
}
