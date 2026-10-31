-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentProofAt" TIMESTAMP(3),
ADD COLUMN     "paymentProofUrl" TEXT;
