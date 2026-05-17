import { NextResponse } from "next/server";
import { getSession, unauthorized, badRequest, forbidden } from "@/lib/session";
import { listAnsiCodes, createAnsiCode } from "@/lib/ansi";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  return NextResponse.json(await listAnsiCodes());
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role !== "admin") return forbidden();

  const body = await req.json();
  if (!body.device_number?.trim()) return badRequest("device_number is required");
  if (!body.common_name?.trim()) return badRequest("common_name is required");

  const code = await createAnsiCode({
    device_number: body.device_number.trim(),
    common_name: body.common_name.trim(),
    description: body.description?.trim() ?? "",
  });
  return NextResponse.json(code, { status: 201 });
}
