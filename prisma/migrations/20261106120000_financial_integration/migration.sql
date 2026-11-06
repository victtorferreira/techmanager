ALTER TABLE "StockMovement" ADD COLUMN "canceledAt" TIMESTAMP(3);
ALTER TABLE "StockMovement" ADD COLUMN "requestKey" TEXT, ADD COLUMN "requestHash" TEXT;
CREATE UNIQUE INDEX "StockMovement_requestKey_key" ON "StockMovement"("requestKey");
ALTER TABLE "FinancialEntry"
  ADD COLUMN "dueAt" TIMESTAMP(3),
  ADD COLUMN "sourceKey" TEXT,
  ADD COLUMN "stockMovementId" TEXT,
  ADD COLUMN "serviceOrderId" TEXT,
  ADD COLUMN "reversalOfId" TEXT;
CREATE UNIQUE INDEX "FinancialEntry_sourceKey_key" ON "FinancialEntry"("sourceKey");
CREATE UNIQUE INDEX "FinancialEntry_stockMovementId_key" ON "FinancialEntry"("stockMovementId");
CREATE UNIQUE INDEX "FinancialEntry_reversalOfId_key" ON "FinancialEntry"("reversalOfId");
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "FinancialEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "FinancialEntry_tenantId_serviceOrderId_idx" ON "FinancialEntry"("tenantId", "serviceOrderId");
