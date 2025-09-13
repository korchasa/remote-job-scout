import { JobCard } from "../JobCard.tsx";
import type { JobPost } from "../../shared/schema.ts";

export default function JobCardExample() {
  const mockJob: JobPost = {
    id: "1",
    title: "Senior React Developer",
    company: "TechCorp Solutions",
    description:
      "We are looking for an experienced React developer to join our team...",
    originalUrl: "https://example.com/job/1",
    source: "LinkedIn",
    location: "Remote (US)",
    employmentType: "Full-time",
    status: "enriched",
    statusReason: null,
    rawData: null,
    techStack: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"],
    responsibilities:
      "Build scalable web applications, collaborate with design team...",
    requirements: "5+ years React experience, TypeScript proficiency...",
    compensation: "$120,000 - $150,000",
    currency: "USD",
    salaryMin: 120000,
    salaryMax: 150000,
    seniority: "Senior",
    remoteType: "Fully Remote",
    timeZone: "EST",
    companySize: "50-200 employees",
    industry: "FinTech",
    companyWebsite: "https://techcorp.com",
    processingStage: 3,
    llmCost: 0.0123,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const handleViewDetails = (job: JobPost) => {
    console.log("View details for job:", job.id);
  };

  const handleSkip = (job: JobPost) => {
    console.log("Skip job:", job.id);
  };

  const handleDefer = (job: JobPost) => {
    console.log("Defer job:", job.id);
  };

  const handleBlacklist = (job: JobPost) => {
    console.log("Blacklist job:", job.id);
  };

  return (
    <JobCard
      job={mockJob}
      onViewDetails={handleViewDetails}
      onSkip={handleSkip}
      onDefer={handleDefer}
      onBlacklist={handleBlacklist}
    />
  );
}
