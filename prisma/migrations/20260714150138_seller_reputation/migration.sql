-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sellerRatingAverage" DOUBLE PRECISION,
ADD COLUMN     "sellerResponseMinutes" INTEGER,
ADD COLUMN     "sellerResponseSampleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sellerReviewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SellerReview" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SellerReview_sellerId_createdAt_idx" ON "SellerReview"("sellerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerReview_buyerId_listingId_key" ON "SellerReview"("buyerId", "listingId");

-- AddForeignKey
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
