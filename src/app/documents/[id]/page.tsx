import { getCurrentUserId } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccessLevel, canView } from "@/lib/documentAccess";
import { DocumentEditor } from "./DocumentEditor";
import Link from "next/link";

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const level = await getAccessLevel(params.id, userId);
  if (!canView(level)) notFound();

  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  if (!doc) notFound();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/documents" className="text-sm text-slate-500 underline">
        ← Back to documents
      </Link>
      <DocumentEditor
        documentId={doc.id}
        initialTitle={doc.title}
        initialContent={doc.content}
        readOnly={level === "VIEWER"}
      />
    </main>
  );
}
