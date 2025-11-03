-- DropIndex
DROP INDEX "public"."Session_refreshToken_key";

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "refreshToken" DROP NOT NULL;
