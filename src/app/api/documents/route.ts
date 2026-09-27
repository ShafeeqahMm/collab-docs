import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const createDocSchema = z.object({
  title: z.string().min(1).max(200),
});

// GET /api/documents - list every doc the current user owns or collaborates on
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const docs = await prisma.document.findMany({
    where: {
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      ownerId: true,
      owner: { select: { name: true } },
    },
  });

  return NextResponse.json(docs);
}

// POST /api/documents - create a new document owned by the current user
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createDocSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const doc = await prisma.document.create({
    data: { title: parsed.data.title, ownerId: userId },
  });

  return NextResponse.json(doc, { status: 201 });
}
