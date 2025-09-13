import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog.tsx";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";
import { Separator } from "./ui/separator.tsx";
import { ScrollArea } from "./ui/scroll-area.tsx";
import {
  Ban,
  Building,
  Calendar,
  Clock,
  Clock3,
  DollarSign,
  ExternalLink,
  Globe,
  MapPin,
  Tag,
  Users,
  X,
} from "lucide-react";
import type { JobPost } from "../../shared/schema.ts";

interface JobDetailsModalProps {
  job: JobPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSkip: (job: JobPost) => void;
  onDefer: (job: JobPost) => void;
  onBlacklist: (job: JobPost) => void;
}

export function JobDetailsModal({
  job,
  isOpen,
  onClose,
  onSkip,
  onDefer,
  onBlacklist,
}: JobDetailsModalProps) {
  if (!job) return null;

  const formatSalary = () => {
    if (job.salaryMin && job.salaryMax && job.currency) {
      return `${job.currency} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`;
    }
    if (job.compensation) {
      return job.compensation;
    }
    return "Salary not specified";
  };

  const handleOpenOriginal = () => {
    globalThis.open(job.originalUrl, "_blank");
  };

  const handleAction = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col"
        data-testid="modal-job-details"
      >
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <h2
                className="text-xl font-semibold leading-tight"
                data-testid="text-modal-job-title"
              >
                {job.title}
              </h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building className="h-4 w-4" />
                <span data-testid="text-modal-company">{job.company}</span>
                <Badge variant="secondary" className="text-xs">
                  {job.source}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {job.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{job.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{formatSalary()}</span>
                </div>

                {job.employmentType && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{job.employmentType}</span>
                  </div>
                )}

                {job.remoteType && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{job.remoteType}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {job.seniority && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{job.seniority}</span>
                  </div>
                )}

                {job.companySize && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{job.companySize}</span>
                  </div>
                )}

                {job.industry && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{job.industry}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Posted {job.createdAt
                      ? new Date(job.createdAt).toLocaleDateString()
                      : "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            {job.techStack && job.techStack.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Technology Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {job.techStack.map((tech, index) => (
                    <Badge key={index} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Job Description */}
            <div>
              <h3 className="font-semibold mb-2">Job Description</h3>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p className="whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>

            {/* Responsibilities */}
            {job.responsibilities && (
              <div>
                <h3 className="font-semibold mb-2">Key Responsibilities</h3>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="whitespace-pre-wrap">{job.responsibilities}</p>
                </div>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && (
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="whitespace-pre-wrap">{job.requirements}</p>
                </div>
              </div>
            )}

            {/* Company Info */}
            {(job.companyWebsite || job.industry || job.companySize) && (
              <div>
                <h3 className="font-semibold mb-2">Company Information</h3>
                <div className="space-y-2 text-sm">
                  {job.companyWebsite && (
                    <div>
                      <span className="font-medium">Website:</span>
                      <a
                        href={job.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {job.companyWebsite}
                      </a>
                    </div>
                  )}
                  {job.industry && (
                    <div>
                      <span className="font-medium">Industry:</span>
                      <span>{job.industry}</span>
                    </div>
                  )}
                  {job.companySize && (
                    <div>
                      <span className="font-medium">Company Size:</span>
                      <span>{job.companySize}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Processing Info */}
            {job.llmCost && (
              <div>
                <h3 className="font-semibold mb-2">Processing Information</h3>
                <div className="text-sm text-muted-foreground">
                  <p>LLM enrichment cost: ${job.llmCost.toFixed(4)}</p>
                  <p>Processing stage: {job.processingStage}/3</p>
                  <p>Status: {job.status}</p>
                  {job.statusReason && <p>Reason: {job.statusReason}</p>}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleOpenOriginal}
            className="flex-1"
            data-testid="button-modal-open-original"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Original
          </Button>
          <Button
            variant="outline"
            onClick={handleAction(() => onDefer(job))}
            data-testid="button-modal-defer"
          >
            <Clock3 className="h-4 w-4 mr-2" />
            Defer
          </Button>
          <Button
            variant="outline"
            onClick={handleAction(() => onSkip(job))}
            data-testid="button-modal-skip"
          >
            <X className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button
            variant="destructive"
            onClick={handleAction(() => onBlacklist(job))}
            data-testid="button-modal-blacklist"
          >
            <Ban className="h-4 w-4 mr-2" />
            Blacklist
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
