import { useState } from "react";
import { JobDetailsModal } from "../JobDetailsModal.tsx";
import { Button } from "../ui/button.tsx";
import type { JobPost } from "../../shared/schema.ts";

export default function JobDetailsModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  const mockJob: JobPost = {
    id: "1",
    title: "Senior Full Stack Developer",
    company: "InnovateTech Inc.",
    description:
      "We are seeking a talented Senior Full Stack Developer to join our dynamic team. You will be responsible for developing and maintaining web applications using modern technologies and frameworks. This role offers the opportunity to work on cutting-edge projects in a collaborative environment.\n\nYou'll work closely with our product and design teams to create exceptional user experiences while ensuring scalability and performance. We value clean code, best practices, and continuous learning.",
    originalUrl: "https://example.com/job/1",
    source: "Indeed",
    location: "San Francisco, CA (Remote OK)",
    employmentType: "Full-time",
    status: "enriched",
    statusReason: null,
    rawData: null,
    techStack: [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL",
      "Docker",
      "AWS",
      "GraphQL",
      "Redis",
    ],
    responsibilities:
      "• Develop and maintain scalable web applications using React and Node.js\n• Collaborate with cross-functional teams to define and implement new features\n• Write clean, maintainable, and well-documented code\n• Optimize applications for maximum speed and scalability\n• Participate in code reviews and mentor junior developers\n• Stay up-to-date with emerging technologies and industry trends",
    requirements:
      "• 5+ years of experience in full-stack development\n• Strong proficiency in React, Node.js, and TypeScript\n• Experience with relational databases (PostgreSQL preferred)\n• Familiarity with cloud platforms (AWS, GCP, or Azure)\n• Understanding of CI/CD pipelines and DevOps practices\n• Excellent problem-solving and communication skills\n• Bachelor's degree in Computer Science or equivalent experience",
    compensation: "$140,000 - $180,000 + equity",
    currency: "USD",
    salaryMin: 140000,
    salaryMax: 180000,
    seniority: "Senior",
    remoteType: "Hybrid",
    timeZone: "PST",
    companySize: "100-500 employees",
    industry: "SaaS",
    companyWebsite: "https://innovatetech.com",
    processingStage: 3,
    llmCost: 0.0234,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const handleSkip = (job: JobPost) => {
    console.log("Skip job:", job.id);
    setIsOpen(false);
  };

  const handleDefer = (job: JobPost) => {
    console.log("Defer job:", job.id);
    setIsOpen(false);
  };

  const handleBlacklist = (job: JobPost) => {
    console.log("Blacklist job:", job.id);
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setIsOpen(true)}>
        Open Job Details Modal
      </Button>

      <JobDetailsModal
        job={mockJob}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSkip={handleSkip}
        onDefer={handleDefer}
        onBlacklist={handleBlacklist}
      />
    </div>
  );
}
