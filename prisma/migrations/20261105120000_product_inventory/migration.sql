-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('INITIAL', 'PURCHASE', 'SERVICE_ORDER', 'RETURN', 'LOSS', 'ADJUSTMENT', 'WARRANTY', 'SALE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "compatibility" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "purchaseDate" DATE,
ADD COLUMN     "quality" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "productName" TEXT NOT NULL,
    "supplierName" TEXT,
    "supplierId" TEXT,
    "serviceOrderId" TEXT,
    "saleId" TEXT,
    "createdById" TEXT,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_sequence_key" ON "StockMovement"("sequence");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_productId_createdAt_idx" ON "StockMovement"("tenantId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_supplierId_occurredAt_idx" ON "StockMovement"("tenantId", "supplierId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing balances become an opening entry; historical purchases cannot be inferred.
INSERT INTO "StockMovement" ("id", "tenantId", "productId", "type", "quantity", "balanceAfter", "unitCost", "productName", "notes", "occurredAt", "createdAt")
SELECT 'opening-' || "id", "tenantId", "id", 'INITIAL', "stockQuantity", "stockQuantity", "costPrice", "name", 'Saldo existente na implantação do controle de estoque; compras e saídas anteriores não estão neste histórico.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "stockQuantity" > 0;

ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_nonnegative" CHECK ("stockQuantity" >= 0 AND "minimumStock" >= 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_nonzero_quantity" CHECK ("quantity" <> 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_nonnegative_balance_cost" CHECK ("balanceAfter" >= 0 AND "unitCost" >= 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_purchase_reference" CHECK ("type" <> 'PURCHASE' OR ("supplierId" IS NOT NULL AND "quantity" > 0));
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_service_reference" CHECK ("type" <> 'SERVICE_ORDER' OR ("serviceOrderId" IS NOT NULL AND "quantity" < 0));
