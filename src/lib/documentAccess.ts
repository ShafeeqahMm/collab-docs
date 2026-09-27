import { prisma } from "./prisma";

export type AccessLevel = "OWNER" | "EDITOR" | "VIEWER" | "NONE";

/**
 * Centralizes the "can this user touch this document" check so every route
 * (get, update, delete, add-collaborator) enforces the same rule instead of
 * each one reimplementing its own ownership/role logic and risking drift.
 */
export async function getAccessLevel(documentId: string, userId: string): Promise<AccessLevel> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { collaborators: { where: { userId } } },
  });

  if (!doc) return "NONE";
  if (doc.ownerId === userId) return "OWNER";

  const collab = doc.collaborators[0];
  if (!collab) return "NONE";
  return collab.role; // "EDITOR" | "VIEWER"
}

export function canEdit(level: AccessLevel): boolean {
  return level === "OWNER" || level === "EDITOR";
}

export function canView(level: AccessLevel): boolean {
  return level !== "NONE";
}
