import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma import before importing the module under test, so this
// stays a fast unit test with no real database required.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getAccessLevel, canEdit, canView } from "@/lib/documentAccess";

const mockFindUnique = prisma.document.findUnique as unknown as ReturnType<typeof vi.fn>;

describe("getAccessLevel", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  it("returns NONE when the document doesn't exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    const level = await getAccessLevel("doc1", "user1");
    expect(level).toBe("NONE");
  });

  it("returns OWNER for the document's owner", async () => {
    mockFindUnique.mockResolvedValue({ ownerId: "user1", collaborators: [] });
    const level = await getAccessLevel("doc1", "user1");
    expect(level).toBe("OWNER");
  });

  it("returns NONE for a user with no relation to the document", async () => {
    mockFindUnique.mockResolvedValue({ ownerId: "someone-else", collaborators: [] });
    const level = await getAccessLevel("doc1", "user1");
    expect(level).toBe("NONE");
  });

  it("returns the collaborator's assigned role", async () => {
    mockFindUnique.mockResolvedValue({
      ownerId: "someone-else",
      collaborators: [{ role: "VIEWER" }],
    });
    const level = await getAccessLevel("doc1", "user1");
    expect(level).toBe("VIEWER");
  });
});

describe("canEdit / canView", () => {
  it("OWNER and EDITOR can edit; VIEWER and NONE cannot", () => {
    expect(canEdit("OWNER")).toBe(true);
    expect(canEdit("EDITOR")).toBe(true);
    expect(canEdit("VIEWER")).toBe(false);
    expect(canEdit("NONE")).toBe(false);
  });

  it("anything but NONE can view", () => {
    expect(canView("OWNER")).toBe(true);
    expect(canView("EDITOR")).toBe(true);
    expect(canView("VIEWER")).toBe(true);
    expect(canView("NONE")).toBe(false);
  });
});
