import { useState } from "react";
import { Input } from "./ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.tsx";
import { Button } from "./ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.tsx";
import { Badge } from "./ui/badge.tsx";
import { Filter, Grid, List, Search } from "lucide-react";
import { JobCard } from "./JobCard.tsx";
import { JobDetailsModal } from "./JobDetailsModal.tsx";
import type { JobPost, JobStatus } from "../../shared/schema.ts";

interface JobListViewProps {
  jobs: JobPost[];
  onJobAction: (job: JobPost, action: "skip" | "defer" | "blacklist") => void;
}

export function JobListView({ jobs, onJobAction }: JobListViewProps) {
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.techStack &&
        job.techStack.some((tech) =>
          tech.toLowerCase().includes(searchQuery.toLowerCase())
        ));

    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesSource = sourceFilter === "all" || job.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  // Get unique sources for filter
  const availableSources = Array.from(new Set(jobs.map((job) => job.source)));

  const handleViewDetails = (job: JobPost) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleJobAction = (
    job: JobPost,
    action: "skip" | "defer" | "blacklist",
  ) => {
    onJobAction(job, action);
  };

  const getStatusCounts = () => {
    const counts = jobs.reduce((acc, job) => {
      const status = job.status as JobStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<JobStatus, number>);

    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Job Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{jobs.length} Total</Badge>
              <Badge variant="default">
                {statusCounts.enriched || 0} Enriched
              </Badge>
              <Badge variant="outline">
                {statusCounts.filtered || 0} Filtered
              </Badge>
              <Badge variant="destructive">
                {statusCounts.blacklisted || 0} Blacklisted
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search jobs, companies, or technologies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-job-search"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value: JobStatus | "all") =>
                setStatusFilter(value)}
            >
              <SelectTrigger
                className="w-[140px]"
                data-testid="select-status-filter"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="filtered">Filtered</SelectItem>
                <SelectItem value="enriched">Enriched</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger
                className="w-[140px]"
                data-testid="select-source-filter"
              >
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {availableSources.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                data-testid="button-grid-view"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                data-testid="button-list-view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p
          className="text-sm text-muted-foreground"
          data-testid="text-results-count"
        >
          Showing {filteredJobs.length} of {jobs.length} jobs
        </p>
      </div>

      {/* Job Grid/List */}
      {filteredJobs.length === 0
        ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No jobs found</p>
                <p className="text-sm">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            </CardContent>
          </Card>
        )
        : (
          <div
            className={viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"}
          >
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewDetails={handleViewDetails}
                onSkip={(job) => handleJobAction(job, "skip")}
                onDefer={(job) => handleJobAction(job, "defer")}
                onBlacklist={(job) => handleJobAction(job, "blacklist")}
              />
            ))}
          </div>
        )}

      {/* Job Details Modal */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSkip={(job) => handleJobAction(job, "skip")}
        onDefer={(job) => handleJobAction(job, "defer")}
        onBlacklist={(job) => handleJobAction(job, "blacklist")}
      />
    </div>
  );
}
