import { prisma } from "@/lib/prisma";

export type DatabaseHealth = {
  connected: boolean;
  label: "DB live" | "DB offline";
  listingCount: number;
};

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    const listingCount = await prisma.listing.count();
    return {
      connected: true,
      label: "DB live",
      listingCount
    };
  } catch {
    return {
      connected: false,
      label: "DB offline",
      listingCount: 0
    };
  }
}
