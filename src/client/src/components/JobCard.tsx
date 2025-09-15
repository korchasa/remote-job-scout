/**
 * JobCard Component
 *
 * Responsibility: Renders individual job postings in card format with essential details and actions
 * Relationships: Used by JobListView component, integrates with ThemeProvider for theming
 * Features: Responsive design, secure external links, blacklist/skip/defer actions, job status indicators
 */

import { Card, CardContent, CardHeader } from './ui/card.tsx';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';
import {
  Ban,
  Building,
  Clock,
  Clock3,
  DollarSign,
  ExternalLink,
  Eye,
  Heart,
  MapPin,
  X,
} from 'lucide-react';
import type { JobPost } from '../../../shared/schema.ts';

interface JobCardProps {
  job: JobPost;
  onViewDetails: (job: JobPost) => void;
  onSkip: (job: JobPost) => Promise<void>;
  onDefer: (job: JobPost) => Promise<void>;
  onBlacklist: (job: JobPost) => Promise<void>;
  onToggleFavorite: (job: JobPost) => void;
  isFavorite: boolean;
}

export function JobCard({
  job,
  onViewDetails,
  onSkip,
  onDefer,
  onBlacklist,
  onToggleFavorite,
  isFavorite,
}: JobCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'filtered':
        return 'bg-blue-500';
      case 'enriched':
        return 'bg-green-500';
      case 'skipped':
        return 'bg-gray-500';
      case 'blacklisted':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatSalary = () => {
    if (job.salaryMin && job.salaryMax && job.currency) {
      return `${job.currency} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`;
    }
    if (job.compensation) {
      return job.compensation;
    }
    return 'Salary not specified';
  };

  // Secure external link handler - creates temporary anchor with security attributes
  // to prevent potential security vulnerabilities from malicious external sites
  const handleOpenOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Create a temporary anchor element with security attributes
    const link = document.createElement('a');
    link.href = job.originalUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const handleAction = (action: () => Promise<void>) => (e: React.MouseEvent) => {
    e.stopPropagation();
    action().catch(console.error);
  };

  return (
    <Card
      className="hover-elevate cursor-pointer transition-all duration-200"
      onClick={() => onViewDetails(job)}
      data-testid={`card-job-${job.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <h3
              className="font-semibold text-lg leading-tight truncate"
              data-testid={`text-job-title-${job.id}`}
            >
              {job.title}
            </h3>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4 flex-shrink-0" />
              <span className="truncate" data-testid={`text-company-${job.id}`}>
                {job.company}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Badge variant="secondary" className="text-xs">
              {job.source}
            </Badge>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Location & Employment Type */}
        <div className="flex flex-wrap gap-2 text-sm">
          {job.location && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{job.location}</span>
            </div>
          )}
          {job.employmentType && (
            <Badge variant="outline" className="text-xs">
              {job.employmentType}
            </Badge>
          )}
          {job.remoteType && (
            <Badge variant="outline" className="text-xs">
              {job.remoteType}
            </Badge>
          )}
        </div>

        {/* Tech Stack */}
        {job.techStack && job.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.techStack.slice(0, 4).map((tech, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
            {job.techStack.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{job.techStack.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Salary & Seniority */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span className="truncate">{formatSalary()}</span>
          </div>
          {job.seniority && (
            <Badge variant="outline" className="text-xs">
              {job.seniority}
            </Badge>
          )}
        </div>

        {/* Time Posted */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Unknown'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="default"
            onClick={handleAction(() => onViewDetails(job))}
            className="flex-1"
            data-testid={`button-view-job-${job.id}`}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            variant={isFavorite ? 'default' : 'outline'}
            onClick={handleAction(() => onToggleFavorite(job))}
            data-testid={`button-favorite-job-${job.id}`}
            className={isFavorite ? 'text-red-600 hover:text-red-700' : ''}
          >
            <Heart className={`h-3 w-3 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenOriginal}
            data-testid={`button-open-original-${job.id}`}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAction(() => onDefer(job))}
            data-testid={`button-defer-job-${job.id}`}
          >
            <Clock3 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAction(() => onSkip(job))}
            data-testid={`button-skip-job-${job.id}`}
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAction(() => onBlacklist(job))}
            data-testid={`button-blacklist-job-${job.id}`}
          >
            <Ban className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
