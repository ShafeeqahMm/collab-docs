import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { getAccessLevel, canEdit, canView } from "@/lib/documentAccess";

const updateDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const level = await getAccessLevel(params.id, userId);
  if (!canView(level)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  return NextResponse.json({ ...doc, accessLevel: level });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const level = await getAccessLevel(params.id, userId);
  if (!canView(level)) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEdit(level)) return NextResponse.json({ error: "forbidden - viewer role cannot edit" }, { status: 403 });

  const body = await req.json();
  const parsed = updateDocSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const doc = await prisma.document.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(doc);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const level = await getAccessLevel(params.id, userId);
  if (level !== "OWNER") {
    return NextResponse.json({ error: "only the owner can delete this document" }, { status: 403 });
  }

  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
