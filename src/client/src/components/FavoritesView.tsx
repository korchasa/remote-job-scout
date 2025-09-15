/**
 * FavoritesView Component
 *
 * Responsibility: Displays list of favorite jobs with search, filtering, and management capabilities
 * Relationships: Used by MainDashboard component, integrates with useFavorites hook for data management
 * Features: Search/filter favorites, view job details, remove from favorites, responsive grid/list layout
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Badge } from './ui/badge.tsx';
import {
  Heart,
  Search,
  Grid,
  List,
  Trash2,
  Building,
  MapPin,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites.ts';
import { JobDetailsModal } from './JobDetailsModal.tsx';
import type { JobPost } from '../../../shared/schema.ts';

// Mock function to convert FavoriteJob to JobPost for compatibility
// In a real implementation, this would be a proper API call or data transformation
const convertFavoriteToJobPost = (favorite: any): JobPost => {
  return {
    id: favorite.jobId,
    title: favorite.title,
    company: favorite.company,
    description: `Favorite job: ${favorite.title} at ${favorite.company}`,
    originalUrl: favorite.originalUrl,
    source: favorite.source,
    location: favorite.location,
    employmentType: favorite.employmentType,
    remoteType: favorite.remoteType,
    salaryMin: favorite.salaryMin,
    salaryMax: favorite.salaryMax,
    currency: favorite.currency,
    status: 'enriched',
  };
};

export function FavoritesView() {
  const { favorites, removeFromFavorites } = useFavorites();
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter favorites based on search query
  const filteredFavorites = favorites.filter((favorite) => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      favorite.title.toLowerCase().includes(searchTerm) ||
      favorite.company.toLowerCase().includes(searchTerm) ||
      favorite.location?.toLowerCase().includes(searchTerm)
    );
  });

  const handleViewDetails = (favorite: any) => {
    const jobPost = convertFavoriteToJobPost(favorite);
    setSelectedJob(jobPost);
    setIsModalOpen(true);
  };

  const handleRemoveFromFavorites = (jobId: string) => {
    removeFromFavorites(jobId);
  };

  const handleToggleFavorite = (job: JobPost) => {
    // Since this is called from modal, remove from favorites
    removeFromFavorites(job.id);
    setIsModalOpen(false);
  };

  const formatSalary = (favorite: any) => {
    if (favorite.salaryMin && favorite.salaryMax && favorite.currency) {
      return `${favorite.currency} ${favorite.salaryMin.toLocaleString()} - ${favorite.salaryMax.toLocaleString()}`;
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

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Heart className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No favorites yet</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Start adding jobs to your favorites by clicking the heart icon on job cards or in the job
          details modal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Favorite Jobs ({favorites.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Badge variant="secondary">{filteredFavorites.length} Showing</Badge>
            {favorites.length > 0 && (
              <Badge variant="default">
                Added {formatDate(favorites[0].addedAt)} (most recent)
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search and View Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search favorites by title, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-favorites-search"
              />
            </div>

            <div className="flex gap-2">
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

      {/* Favorites List */}
      {filteredFavorites.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No matches found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or clear the search to see all favorites.
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
          {filteredFavorites.map((favorite) => (
            <Card key={favorite.id} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="font-semibold text-lg leading-tight truncate">
                      {favorite.title}
                    </h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{favorite.company}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <Badge variant="secondary" className="text-xs">
                      {favorite.source}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Location & Employment Type */}
                <div className="flex flex-wrap gap-2 text-sm">
                  {favorite.location && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{favorite.location}</span>
                    </div>
                  )}
                  {favorite.employmentType && (
                    <Badge variant="outline" className="text-xs">
                      {favorite.employmentType}
                    </Badge>
                  )}
                  {favorite.remoteType && (
                    <Badge variant="outline" className="text-xs">
                      {favorite.remoteType}
                    </Badge>
                  )}
                </div>

                {/* Salary */}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  <span className="truncate">{formatSalary(favorite)}</span>
                </div>

                {/* Added Date */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Added {formatDate(favorite.addedAt)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleViewDetails(favorite)}
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveFromFavorites(favorite.jobId)}
                    data-testid={`button-remove-favorite-${favorite.jobId}`}
                  >
                    <Trash2 className="h-3 w-3" />
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
          isFavorite={true} // Always true since we're in favorites view
        />
      )}
    </div>
  );
}
