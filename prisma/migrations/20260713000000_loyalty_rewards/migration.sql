ALTER TABLE "LoyaltyEvent" ADD COLUMN "rewardKey" TEXT;
ALTER TABLE "CreditLedgerEntry" ADD COLUMN "rewardKey" TEXT;

CREATE UNIQUE INDEX "LoyaltyEvent_rewardKey_key" ON "LoyaltyEvent"("rewardKey");
CREATE UNIQUE INDEX "CreditLedgerEntry_rewardKey_key" ON "CreditLedgerEntry"("rewardKey");
CREATE INDEX "LoyaltyEvent_userId_createdAt_idx" ON "LoyaltyEvent"("userId", "createdAt");
