import { NextRequest, NextResponse } from "next/server";
import { jsonError, readJson, requireUser } from "@/lib/http";
import { withTransaction } from "@/lib/db";

export const runtime = "nodejs";

type CreateBookingBody = {
  equipmentId?: number;
  dateStart?: string;
  dateEnd?: string;
  ecrRef?: string;
  notes?: string;
};

function parseDate(value: string | undefined, endOfDay = false): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const suffix = endOfDay ? "T23:59:59.000Z" : "T00:00:00.000Z";
  const parsed = new Date(`${value}${suffix}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = requireUser(request);
  if (!user) {
    return jsonError("Trebuie să fii autentificat pentru a crea o rezervare.", 401);
  }

  const body = await readJson<CreateBookingBody>(request);
  const equipmentId = Number(body.equipmentId);
  const dateStart = parseDate(body.dateStart);
  const dateEnd = parseDate(body.dateEnd, true);

  if (!Number.isInteger(equipmentId)) {
    return jsonError("Selectează un echipament.");
  }

  if (!dateStart || !dateEnd) {
    return jsonError("Selectează datele de start și end.");
  }

  if (dateStart > dateEnd) {
    return jsonError("Data de start trebuie să fie înainte de data de end.");
  }

  try {
    await withTransaction(async (client) => {
      const overlap = await client.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM bookings
          WHERE equipment_id = $1
            AND date_start < $3
            AND date_end > $2
        `,
        [equipmentId, dateStart, dateEnd]
      );

      if (Number(overlap.rows[0]?.count ?? 0) > 0) {
        throw new Error("BOOKING_OVERLAP");
      }

      await client.query(
        `
          INSERT INTO bookings
            (equipment_id, user_id, date_start, date_end, ecr_ref, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          equipmentId,
          user.id,
          dateStart,
          dateEnd,
          body.ecrRef?.trim() ?? "",
          body.notes?.trim() ?? ""
        ]
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_OVERLAP") {
      return jsonError(
        "Echipamentul este deja rezervat în acest interval.\nAltă persoană a făcut booking între timp."
      );
    }

    if (typeof error === "object" && error && "code" in error && error.code === "23P01") {
      return jsonError(
        "Echipamentul este deja rezervat în acest interval.\nAltă persoană a făcut booking între timp."
      );
    }

    throw error;
  }

  return NextResponse.json({ ok: true });
}
