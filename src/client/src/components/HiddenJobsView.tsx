/**
 * HiddenJobsView Component (FR-11: Client-Side Job Actions)
 *
 * Responsibility: Displays list of user-hidden jobs with search, filtering, and restoration capabilities
 * Relationships: Used by MainDashboard component, integrates with useClientJobActions hook for data management
 * Features: Search/filter hidden jobs, view job details, restore hidden jobs, show hide reasons
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Badge } from './ui/badge.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.tsx';
import {
  Eye,
  Search,
  Grid,
  List,
  RotateCcw,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  EyeOff,
  Ban,
} from 'lucide-react';
import { useClientJobActions } from '../hooks/useClientJobActions.ts';
import { JobDetailsModal } from './JobDetailsModal.tsx';
import type { JobPost, HiddenJob } from '../../../shared/schema.ts';

// Mock function to convert HiddenJob to JobPost for compatibility
const convertHiddenToJobPost = (hidden: HiddenJob): JobPost => {
  return {
    id: hidden.jobId,
    title: hidden.title,
    company: hidden.company,
    description: `Hidden job: ${hidden.title} at ${hidden.company}`,
    originalUrl: hidden.originalUrl,
    source: hidden.source,
    location: hidden.location,
    employmentType: hidden.employmentType,
    status: 'filtered', // Hidden jobs are considered filtered
    salaryMin: hidden.salaryMin,
    salaryMax: hidden.salaryMax,
    currency: hidden.currency,
    remoteType: hidden.remoteType,
  };
};

export function HiddenJobsView() {
  const { hiddenJobs, blockedCompanies, restoreJob } = useClientJobActions();
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState<HiddenJob['hiddenReason'] | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter hidden jobs based on search and filters
  const filteredHiddenJobs = hiddenJobs.filter((hidden) => {
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch =
      [hidden.title, hidden.company, hidden.location].some((field) =>
        field?.toLowerCase().includes(searchTerm),
      ) ?? false;

    const matchesReason = reasonFilter === 'all' || hidden.hiddenReason === reasonFilter;

    return matchesSearch && matchesReason;
  });

  // Get statistics
  const stats = {
    total: hiddenJobs.length,
    byReason: {
      manual: hiddenJobs.filter((job) => job.hiddenReason === 'manual').length,
      defer: hiddenJobs.filter((job) => job.hiddenReason === 'defer').length,
      skip: hiddenJobs.filter((job) => job.hiddenReason === 'skip').length,
    },
  };

  const handleViewDetails = (hidden: HiddenJob) => {
    const jobPost = convertHiddenToJobPost(hidden);
    setSelectedJob(jobPost);
    setIsModalOpen(true);
  };

  const handleRestoreJob = (jobId: string) => {
    restoreJob(jobId);
  };

  const handleToggleFavorite = () => {
    // Hidden jobs view doesn't handle favorites
    setIsModalOpen(false);
  };

  const formatSalary = (hidden: HiddenJob) => {
    if (hidden.salaryMin && hidden.salaryMax && hidden.currency) {
      return `${hidden.currency} ${hidden.salaryMin.toLocaleString()} - ${hidden.salaryMax.toLocaleString()}`;
    }
    return 'Salary not specified';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getReasonIcon = (reason: HiddenJob['hiddenReason']) => {
    switch (reason) {
      case 'manual':
        return <EyeOff className="h-3 w-3" />;
      case 'defer':
        return <Clock className="h-3 w-3" />;
      case 'skip':
        return <RotateCcw className="h-3 w-3" />;
      default:
        return <EyeOff className="h-3 w-3" />;
    }
  };

  const getReasonColor = (reason: HiddenJob['hiddenReason']) => {
    switch (reason) {
      case 'manual':
        return 'bg-gray-500';
      case 'defer':
        return 'bg-yellow-500';
      case 'skip':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (hiddenJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <EyeOff className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No hidden jobs</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Jobs you hide will appear here. You can restore them to make them visible again.
        </p>
        {blockedCompanies.length > 0 && (
          <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <Ban className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-800 dark:text-orange-200">
                {blockedCompanies.length} blocked companies
              </span>
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Jobs from blocked companies are automatically hidden and won't appear in your results.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5 text-orange-500" />
            Hidden Jobs ({stats.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Badge variant="secondary">{filteredHiddenJobs.length} Showing</Badge>
            {stats.byReason.manual > 0 && (
              <Badge variant="outline" className="text-gray-600">
                {stats.byReason.manual} Manual
              </Badge>
            )}
            {stats.byReason.defer > 0 && (
              <Badge variant="outline" className="text-yellow-600">
                {stats.byReason.defer} Deferred
              </Badge>
            )}
            {stats.byReason.skip > 0 && (
              <Badge variant="outline" className="text-blue-600">
                {stats.byReason.skip} Skipped
              </Badge>
            )}
            {blockedCompanies.length > 0 && (
              <Badge variant="outline" className="text-orange-600">
                {blockedCompanies.length} Companies Blocked
              </Badge>
            )}
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
                placeholder="Search hidden jobs by title, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-hidden-search"
              />
            </div>

            <Select
              value={reasonFilter}
              onValueChange={(value: HiddenJob['hiddenReason'] | 'all') => setReasonFilter(value)}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-reason-filter">
                <SelectValue placeholder="Reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="defer">Deferred</SelectItem>
                <SelectItem value="skip">Skipped</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                data-testid="button-view-mode-grid"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                data-testid="button-view-mode-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden Jobs List */}
      {filteredHiddenJobs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No matches found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or reason filter to see more hidden jobs.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredHiddenJobs.map((hidden) => (
            <Card key={hidden.id} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="font-semibold text-lg leading-tight truncate">{hidden.title}</h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{hidden.company}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <Badge variant="secondary" className="text-xs">
                      {hidden.source}
                    </Badge>
                    <div
                      className={`w-2 h-2 rounded-full ${getReasonColor(hidden.hiddenReason)}`}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Location & Employment Type */}
                <div className="flex flex-wrap gap-2 text-sm">
                  {hidden.location && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{hidden.location}</span>
                    </div>
                  )}
                  {hidden.employmentType && (
                    <Badge variant="outline" className="text-xs">
                      {hidden.employmentType}
                    </Badge>
                  )}
                  {hidden.remoteType && (
                    <Badge variant="outline" className="text-xs">
                      {hidden.remoteType}
                    </Badge>
                  )}
                </div>

                {/* Reason for hiding */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Hidden because:</span>
                  <div className="flex items-center gap-1">
                    {getReasonIcon(hidden.hiddenReason)}
                    <span className="capitalize">{hidden.hiddenReason}</span>
                  </div>
                </div>

                {/* Salary */}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  <span className="truncate">{formatSalary(hidden)}</span>
                </div>

                {/* Hidden Date */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Hidden {formatDate(hidden.hiddenAt)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleViewDetails(hidden)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreJob(hidden.jobId)}
                    data-testid={`button-restore-job-${hidden.jobId}`}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSkip={async () => {}}
          onDefer={async () => {}}
          onBlacklist={async () => {}}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={false} // Hidden jobs aren't favorites
        />
      )}
    </div>
  );
}
