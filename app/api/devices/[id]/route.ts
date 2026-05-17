import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound, badRequest } from "@/lib/session";
import { getDevice, updateDevice, deleteDevice, getDeviceByKKS } from "@/lib/devices";
import { assembleKKS } from "@/lib/kks";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  return NextResponse.json(device);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  const body = await req.json();

  // If KKS parts changed, check new kks_full is still unique
  const merged = { ...device, ...body };
  const newKks = assembleKKS(merged);
  if (newKks !== device.kks_full) {
    const conflict = await getDeviceByKKS(newKks);
    if (conflict && conflict.id !== id) return badRequest(`KKS ${newKks} is already in use`);
  }

  await updateDevice(id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  await deleteDevice(id);
  return NextResponse.json({ ok: true });
}
