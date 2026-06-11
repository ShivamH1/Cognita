-- CreateTable
CREATE TABLE "AssessmentEnrollment" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentEnrollment_studentId_idx" ON "AssessmentEnrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentEnrollment_assessmentId_studentId_key" ON "AssessmentEnrollment"("assessmentId", "studentId");

-- AddForeignKey
ALTER TABLE "AssessmentEnrollment" ADD CONSTRAINT "AssessmentEnrollment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEnrollment" ADD CONSTRAINT "AssessmentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
