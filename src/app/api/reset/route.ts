import { NextResponse } from "next/server";
import { resetRuntime } from "@/lib/customs/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const rt = resetRuntime();
  return NextResponse.json({
    ok: true,
    events: rt.ledger.all().length,
    chain: rt.ledger.audit(),
    ephemeral: rt.ephemeral,
  });
}
