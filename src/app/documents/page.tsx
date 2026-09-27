import { getCurrentUserId } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { NewDocumentForm } from "./NewDocumentForm";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DocumentsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const docs = await prisma.document.findMany({
    where: {
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { name: true } } },
  });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your documents</h1>
        <SignOutButton />
      </div>

      <NewDocumentForm />

      <ul className="mt-8 divide-y divide-slate-200">
        {docs.length === 0 && (
          <p className="py-8 text-center text-slate-500">
            No documents yet — create your first one above.
          </p>
        )}
        {docs.map((doc) => (
          <li key={doc.id} className="py-3">
            <Link href={`/documents/${doc.id}`} className="font-medium hover:underline">
              {doc.title}
            </Link>
            <p className="text-sm text-slate-500">
              {doc.ownerId === userId ? "Owned by you" : `Shared by ${doc.owner.name}`} · last
              edited {doc.updatedAt.toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
