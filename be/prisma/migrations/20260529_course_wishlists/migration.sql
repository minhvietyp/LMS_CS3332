-- CreateTable
CREATE TABLE "course_wishlists" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_wishlists_courseId_studentId_key" ON "course_wishlists"("courseId", "studentId");

-- CreateIndex
CREATE INDEX "course_wishlists_studentId_createdAt_idx" ON "course_wishlists"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "course_wishlists_courseId_createdAt_idx" ON "course_wishlists"("courseId", "createdAt");

-- AddForeignKey
ALTER TABLE "course_wishlists" ADD CONSTRAINT "course_wishlists_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_wishlists" ADD CONSTRAINT "course_wishlists_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
