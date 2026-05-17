import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, notFound } from "@/lib/session";
import { getPart, updatePart, deletePart } from "@/lib/parts";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const part = await getPart(id);
  if (!part) return notFound();
  return NextResponse.json(part);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.user.role !== "admin") return forbidden();

  const { id } = await params;
  const part = await getPart(id);
  if (!part) return notFound();

  const body = await req.json();
  await updatePart(id, {
    part_number: body.part_number?.trim(),
    device_type: body.device_type?.trim(),
    relay_type: body.relay_type,
    description: body.description?.trim(),
    firmware: body.firmware?.trim(),
    nominal_supply_voltage: body.nominal_supply_voltage?.trim(),
    nominal_ct_input: body.nominal_ct_input?.trim(),
    nominal_vt_input: body.nominal_vt_input?.trim(),
    stock_number: body.stock_number?.trim(),
  });

  return NextResponse.json(await getPart(id));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.user.role !== "admin") return forbidden();

  const { id } = await params;
  const part = await getPart(id);
  if (!part) return notFound();

  await deletePart(id);
  return new NextResponse(null, { status: 204 });
}
