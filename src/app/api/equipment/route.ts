import { NextRequest, NextResponse } from "next/server";
import { executeDb, queryDb } from "@/lib/db";
import { jsonError, readJson, requireAdmin } from "@/lib/http";
import type { Equipment } from "@/lib/types";

export const runtime = "nodejs";

type EquipmentRow = {
  id: number;
  name: string;
  type: string;
  description: string;
  is_active: boolean;
  image_data_url: string | null;
};

type CreateEquipmentBody = {
  name?: string;
  type?: string;
  description?: string;
};

function mapEquipment(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    isActive: row.is_active,
    imageDataUrl: row.image_data_url
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const admin = requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") !== "false";

  if (!activeOnly && !admin) {
    return jsonError("Nu ai acces la această zonă.", 403);
  }

  const rows = await queryDb<EquipmentRow>(
    `
      SELECT id, name, type, description, is_active, image_data_url
      FROM equipment
      ${activeOnly ? "WHERE is_active = TRUE" : ""}
      ORDER BY name
    `
  );

  return NextResponse.json({ equipment: rows.map(mapEquipment) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!requireAdmin(request)) {
    return jsonError("Nu ai acces la această zonă.", 403);
  }

  const body = await readJson<CreateEquipmentBody>(request);
  const name = body.name?.trim() ?? "";

  if (!name) {
    return jsonError("Completează numele echipamentului.");
  }

  try {
    await executeDb(
      `
        INSERT INTO equipment (name, type, description)
        VALUES ($1, $2, $3)
      `,
      [name, body.type?.trim() ?? "", body.description?.trim() ?? ""]
    );
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return jsonError("Echipamentul cu acest nume există deja.");
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
