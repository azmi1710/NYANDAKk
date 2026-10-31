import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/notify";
import { isOpenNow, ALL_VILLAGES, ZONE_A, ZONE_B, ZONE_C } from "@/lib/nyandak";

// Data publik untuk halaman masuk: tarif, jam buka, pengumuman, kurir online
export async function GET() {
  const s = await getSettings();
  const [kurirOnline, orderCount] = await Promise.all([
    db.user.count({ where: { role: "KURIR", online: true, status: "ACTIVE" } }),
    db.order.count(),
  ]);
  return NextResponse.json({
    fares: { A: +s.fareA, B: +s.fareB, C: +s.fareC },
    openHour: +s.openHour, closeHour: +s.closeHour,
    openNow: isOpenNow(+s.openHour, +s.closeHour),
    codLimit: +s.codLimit,
    announcement: s.announcement || "",
    kurirOnline, orderCount,
    zones: { A: ZONE_A, B: ZONE_B, C: ZONE_C },
    villages: ALL_VILLAGES,
  });
}
