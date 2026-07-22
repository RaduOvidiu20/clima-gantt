import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import type { Booking, CalendarPayload, Equipment } from "@/lib/types";

export const runtime = "nodejs";

type EquipmentRow = {
  id: number;
  name: string;
  type: string;
  description: string;
  is_active: boolean;
  image_data_url: string | null;
};

type BookingRow = {
  id: number;
  equipment_id: number;
  user_id: number;
  date_start: Date;
  date_end: Date;
  ecr_ref: string;
  notes: string;
  created_at: Date;
  user_name: string;
  user_first_name: string;
  user_last_name: string;
  user_badge_id: string;
  user_email: string;
  equipment_name: string;
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

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    userId: row.user_id,
    dateStart: row.date_start.toISOString(),
    dateEnd: row.date_end.toISOString(),
    ecrRef: row.ecr_ref,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    userName: row.user_name,
    userFirstName: row.user_first_name,
    userLastName: row.user_last_name,
    userBadgeId: row.user_badge_id,
    userEmail: row.user_email,
    equipmentName: row.equipment_name
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year") ?? now.getFullYear());
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Luna cerută este invalidă." }, { status: 400 });
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59));

  const [equipmentRows, bookingRows] = await Promise.all([
    queryDb<EquipmentRow>(
      `
        SELECT id, name, type, description, is_active, image_data_url
        FROM equipment
        WHERE is_active = TRUE
        ORDER BY name
      `
    ),
    queryDb<BookingRow>(
      `
        SELECT
          b.id,
          b.equipment_id,
          b.user_id,
          b.date_start,
          b.date_end,
          b.ecr_ref,
          b.notes,
          b.created_at,
          u.username AS user_name,
          u.first_name AS user_first_name,
          u.last_name AS user_last_name,
          u.badge_id AS user_badge_id,
          u.email AS user_email,
          e.name AS equipment_name
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        JOIN equipment e ON e.id = b.equipment_id
        WHERE b.date_start < $2 AND b.date_end > $1
        ORDER BY b.date_start
      `,
      [monthStart, monthEnd]
    )
  ]);

  const payload: CalendarPayload = {
    equipment: equipmentRows.map(mapEquipment),
    bookings: bookingRows.map(mapBooking)
  };

  return NextResponse.json(payload);
}
