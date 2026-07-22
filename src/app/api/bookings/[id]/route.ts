import { NextRequest, NextResponse } from "next/server";
import { executeDb, queryOne } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

type BookingOwnerRow = {
  user_id: number;
};

export async function DELETE(
  request: NextRequest,
  context: Params
): Promise<NextResponse> {
  const user = requireUser(request);
  if (!user) {
    return jsonError("Trebuie să fii autentificat pentru această acțiune.", 401);
  }

  const { id } = await context.params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) {
    return jsonError("Rezervare invalidă.");
  }

  const booking = await queryOne<BookingOwnerRow>(
    "SELECT user_id FROM bookings WHERE id = $1",
    [bookingId]
  );

  if (!booking) {
    return jsonError("Rezervarea nu mai există.", 404);
  }

  if (user.role !== "Admin" && user.id !== booking.user_id) {
    return jsonError("Poți șterge doar rezervările tale.", 403);
  }

  await executeDb("DELETE FROM bookings WHERE id = $1", [bookingId]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  context: Params
): Promise<NextResponse> {
  const user = requireUser(request);
  if (!user) {
    return jsonError("Trebuie să fii autentificat pentru această acțiune.", 401);
  }

  const { id } = await context.params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) {
    return jsonError("Rezervare invalidă.");
  }

  const booking = await queryOne<BookingOwnerRow>(
    "SELECT user_id FROM bookings WHERE id = $1",
    [bookingId]
  );

  if (!booking) {
    return jsonError("Rezervarea nu mai există.", 404);
  }

  // Permisiunea de a edita: Doar Admin sau Creatorul (cel care a făcut rezervarea originală)
  if (user.role !== "Admin" && user.id !== booking.user_id) {
    return jsonError("Poți edita doar rezervările tale.", 403);
  }

  try {
    const body = await request.json();
    const { equipmentId, dateStart, dateEnd, ecrRef, notes } = body;

    if (!equipmentId || !dateStart || !dateEnd) {
      return jsonError("Date incomplete.");
    }

    if (dateStart > dateEnd) {
      return jsonError("Data de început nu poate fi după data de sfârșit.");
    }

    // Checking for overlapping bookings excluding the current one
    const overlap = await queryOne<{ id: number }>(
      `
      SELECT id FROM bookings
      WHERE equipment_id = $1
        AND id != $2
        AND date_start <= $4
        AND date_end >= $3
      LIMIT 1
      `,
      [equipmentId, bookingId, dateStart, dateEnd]
    );

    if (overlap) {
      return jsonError("Echipamentul este deja rezervat în acea perioadă.");
    }

    await executeDb(
      `
      UPDATE bookings 
      SET equipment_id = $1, date_start = $2, date_end = $3, ecr_ref = $4, notes = $5 
      WHERE id = $6
      `,
      [equipmentId, dateStart, dateEnd, ecrRef || "", notes || "", bookingId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError("Eroare la procesarea cererii.", 400);
  }
}
