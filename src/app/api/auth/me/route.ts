import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import type { Permission, User } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionUser = getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ user: null });
  }

  const row = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { userRole: true }
  });

  if (!row) {
    return NextResponse.json({ user: null });
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

  return NextResponse.json({ user });
}
