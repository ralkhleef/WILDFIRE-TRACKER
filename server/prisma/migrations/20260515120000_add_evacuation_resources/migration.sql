-- CreateTable
CREATE TABLE "EvacuationResource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "county" TEXT,
    "state" TEXT NOT NULL DEFAULT 'CA',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "capacity" INTEGER,
    "openNow" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvacuationResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvacuationResource_latitude_longitude_idx" ON "EvacuationResource"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "EvacuationResource_type_idx" ON "EvacuationResource"("type");
