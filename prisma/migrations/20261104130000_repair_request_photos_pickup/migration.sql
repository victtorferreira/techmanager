ALTER TABLE "ServiceOrder"
ADD COLUMN "deliveryMethod" TEXT,
ADD COLUMN "pickupAddress" TEXT,
ADD COLUMN "devicePhotos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
