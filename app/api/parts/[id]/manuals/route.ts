import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, notFound, badRequest } from "@/lib/session";
import { getPart, listManuals, createManual } from "@/lib/parts";
import { mkdirSync } from "node:fs";
import path from "path";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const part = await getPart(id);
  if (!part) return notFound();

  return NextResponse.json(await listManuals(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.user.role !== "admin") return forbidden();

  const { id } = await params;
  const part = await getPart(id);
  if (!part) return notFound();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return badRequest("file is required");

  const description = (formData.get("description") as string | null)?.trim() ?? "";
  const ext = path.extname(file.name) || ".pdf";
  const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${nanoid(8)}_${safeName}`;

  const dir = path.join(process.cwd(), "public", "uploads", "manuals");
  mkdirSync(dir, { recursive: true });
  await Bun.write(path.join(dir, filename), await file.arrayBuffer());

  void ext; // used via safeName which preserves extension
  const manual = await createManual({
    part_id: id,
    filename,
    original_name: file.name,
    description,
  });

  return NextResponse.json(manual, { status: 201 });
}
