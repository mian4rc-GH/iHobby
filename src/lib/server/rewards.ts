import { CreditLedgerKind, CreditLedgerStatus, type Prisma } from "@prisma/client";

export const rewardRules = [
  {
    type: "ACCOUNT_CREATED",
    title: "Welcome reward",
    description: "Awarded once when a marketplace account is created.",
    points: 100,
    credits: 100
  },
  {
    type: "SELLER_APPROVED",
    title: "Seller access approved",
    description: "Awarded once when an admin approves seller access.",
    points: 300,
    credits: 150
  },
  {
    type: "LISTING_APPROVED",
    title: "Listing approved",
    description: "Awarded once for each listing approved by an admin.",
    points: 150,
    credits: 75
  }
] as const;

export type RewardType = (typeof rewardRules)[number]["type"];

type RewardMetadata = Record<string, string | number | boolean | null>;

export async function awardReward(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    type: RewardType;
    sourceId: string;
    metadata?: RewardMetadata;
  }
) {
  const rule = rewardRules.find((candidate) => candidate.type === input.type);
  if (!rule) throw new Error(`Unknown reward type: ${input.type}`);

  // The same key is stored on both records so retrying an action cannot issue a second award.
  const rewardKey = `${input.type}:${input.sourceId}`;
  const metadata = {
    rewardType: input.type,
    sourceId: input.sourceId,
    ...input.metadata
  };

  await tx.loyaltyEvent.upsert({
    where: { rewardKey },
    update: {},
    create: {
      userId: input.userId,
      points: rule.points,
      reason: rule.title,
      rewardKey,
      metadata
    }
  });

  await tx.creditLedgerEntry.upsert({
    where: { rewardKey },
    update: {},
    create: {
      userId: input.userId,
      amount: rule.credits,
      kind: CreditLedgerKind.CREDIT,
      status: CreditLedgerStatus.POSTED,
      reason: rule.title,
      rewardKey,
      metadata
    }
  });

  return rule;
}
