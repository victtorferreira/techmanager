-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "CustomerClassification" AS ENUM ('NORMAL', 'VIP', 'PREMIUM');

-- CreateEnum
CREATE TYPE "CustomerPriceTable" AS ENUM ('RETAIL', 'WHOLESALE');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "addressReference" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "cityIbgeCode" TEXT,
ADD COLUMN     "classification" "CustomerClassification" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "deliveryRoute" TEXT,
ADD COLUMN     "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceEmail" TEXT,
ADD COLUMN     "isTaxPayer" BOOLEAN,
ADD COLUMN     "municipalRegistration" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "photoData" TEXT,
ADD COLUMN     "priceTable" "CustomerPriceTable" NOT NULL DEFAULT 'RETAIL',
ADD COLUMN     "state" TEXT,
ADD COLUMN     "stateRegistration" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "whatsappSameAsPhone" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "zipCode" TEXT;
