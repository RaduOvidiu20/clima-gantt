import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "./session";
import type { SessionUser } from "./types";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function requireUser(request: NextRequest): SessionUser | null {
  return getSessionUser(request);
}

export function requireAdmin(request: NextRequest): SessionUser | null {
  const user = getSessionUser(request);
  if (!user) return null;
  
  const hasAdmin = user.permissions 
    ? user.permissions.includes("admin") 
    : user.role === "Admin";

  if (!hasAdmin) return null;
  return user;
}

export async function readJson<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
