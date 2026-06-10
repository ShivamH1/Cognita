-- CreateTable
CREATE TABLE "Roadmap" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "targetAudience" TEXT,
    "durationWeeks" INTEGER,
    "phases" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT,
    "generatedAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapEnrollment" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "completedTasks" TEXT[],
    "completedResources" TEXT[],
    "notes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Roadmap_ownerId_idx" ON "Roadmap"("ownerId");

-- CreateIndex
CREATE INDEX "RoadmapEnrollment_studentId_idx" ON "RoadmapEnrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapEnrollment_roadmapId_studentId_key" ON "RoadmapEnrollment"("roadmapId", "studentId");

-- AddForeignKey
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapEnrollment" ADD CONSTRAINT "RoadmapEnrollment_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapEnrollment" ADD CONSTRAINT "RoadmapEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
