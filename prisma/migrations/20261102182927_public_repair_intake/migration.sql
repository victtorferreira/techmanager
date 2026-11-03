-- AlterTable
ALTER TABLE "ServiceOrder" ADD COLUMN     "accessories" TEXT,
ADD COLUMN     "contactTime" TEXT,
ADD COLUMN     "devicePowersOn" BOOLEAN,
ADD COLUMN     "liquidDamage" BOOLEAN,
ADD COLUMN     "preferredContact" TEXT,
ADD COLUMN     "previousRepair" BOOLEAN,
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "publicRequest" BOOLEAN NOT NULL DEFAULT false;
