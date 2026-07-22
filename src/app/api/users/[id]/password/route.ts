import { NextRequest, NextResponse } from "next/server";
import { executeDb } from "@/lib/db";
import { jsonError, readJson, requireAdmin } from "@/lib/http";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

type ResetPasswordBody = {
  password?: string;
};

export async function PATCH(
  request: NextRequest,
  context: Params
): Promise<NextResponse> {
  if (!requireAdmin(request)) {
    return jsonError("Nu ai acces la această zonă.", 403);
  }

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return jsonError("Utilizator invalid.");
  }

  const body = await readJson<ResetPasswordBody>(request);
  const password = body.password ?? "";
  if (!password) {
    return jsonError("Completează parola nouă.");
  }

  await executeDb("UPDATE users SET password_hash = $1 WHERE id = $2", [
    hashPassword(password),
    userId
  ]);

  return NextResponse.json({ ok: true });
}
