import { NextRequest, NextResponse } from "next/server";
import { executeDb } from "@/lib/db";
import { jsonError, readJson, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

type UpdateEquipmentBody = {
  name?: string;
  type?: string;
  description?: string;
  isActive?: boolean;
  imageDataUrl?: string | null;
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
  if (!id) return jsonError("Echipament invalid.");

  const body = await readJson<UpdateEquipmentBody>(request);
  const updateImage = "imageDataUrl" in body;
  await executeDb(
    `
      UPDATE equipment
      SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        description = COALESCE($3, description),
        is_active = COALESCE($4, is_active),
        image_data_url = CASE WHEN $5 THEN $6 ELSE image_data_url END
      WHERE id = $7
    `,
    [
      body.name?.trim() || null,
      body.type?.trim() ?? null,
      body.description?.trim() ?? null,
      typeof body.isActive === "boolean" ? body.isActive : null,
      updateImage,
      updateImage ? (body.imageDataUrl ?? null) : null,
      id
    ]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  context: Params
): Promise<NextResponse> {
  if (!requireAdmin(request)) {
    return jsonError("Nu ai acces la această zonă.", 403);
  }

  const id = await getId(context);
  if (!id) return jsonError("Echipament invalid.");

  await executeDb("DELETE FROM equipment WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
