"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, Download, ExternalLink, BookOpen, Users, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  source: string;
  year: string;
  abstract: string;
  url: string;
  sourceType: 'journal' | 'preprint' | 'conference';
  database: 'PubMed' | 'arXiv' | 'CrossRef' | 'Semantic Scholar';
  doi?: string;
  citationCount?: number;
  credibilityScore: number;
  peerReviewed: boolean;
}

interface SearchFilters {
  sources: string[];
  yearFrom?: number;
  yearTo?: number;
  sourceType: string;
  sortBy: string;
  includeAbstracts: boolean;
  minCredibility: number;
}

export function AcademicSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    sources: ['pubmed', 'arxiv', 'crossref', 'semanticScholar'],
    sourceType: 'all',
    sortBy: 'relevance',
    includeAbstracts: true,
    minCredibility: 0.5
  });
  const [activeTab, setActiveTab] = useState('search');
  const [searchStats, setSearchStats] = useState({
    totalResults: 0,
    searchTime: 0,
    sourceBreakdown: {} as Record<string, number>
  });

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        query,
        sources: filters.sources.join(','),
        maxResults: '50',
        sourceType: filters.sourceType,
        sortBy: filters.sortBy,
        includeAbstracts: filters.includeAbstracts.toString(),
        ...(filters.yearFrom && { yearFrom: filters.yearFrom.toString() }),
        ...(filters.yearTo && { yearTo: filters.yearTo.toString() })
      });

      const startTime = Date.now();
      const response = await fetch(`/api/academic/search?${searchParams}`);
      const data = await response.json();
      const searchTime = Date.now() - startTime;

      if (data.success) {
        const filteredResults = data.results.filter(
          (paper: Paper) => paper.credibilityScore >= filters.minCredibility
        );
        
        setResults(filteredResults);
        setSearchStats({
          totalResults: filteredResults.length,
          searchTime,
          sourceBreakdown: filteredResults.reduce((acc: Record<string, number>, paper: Paper) => {
            acc[paper.database] = (acc[paper.database] || 0) + 1;
            return acc;
          }, {})
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaperSelection = (paperId: string) => {
    setSelectedPapers(prev => 
      prev.includes(paperId) 
        ? prev.filter(id => id !== paperId)
        : [...prev, paperId]
    );
  };

  const handleAddToCitations = async () => {
    if (selectedPapers.length === 0) return;

    try {
      const papersToAdd = results.filter(paper => selectedPapers.includes(paper.id));
      
      for (const paper of papersToAdd) {
        const citationData = {
          title: paper.title,
          authors: paper.authors.join(', '),
          source: paper.source,
          year: paper.year,
          url: paper.url,
          doi: paper.doi,
          citation_style: 'apa', // Default style
          source_type: paper.sourceType,
          credibility_score: paper.credibilityScore
        };

        await fetch('/api/research/citations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(citationData)
        });
      }

      setSelectedPapers([]);
      // Show success message
    } catch (error) {
      console.error('Error adding citations:', error);
    }
  };

  const getCredibilityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCredibilityLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Academic Search</h2>
          <p className="text-muted-foreground">
            Search across PubMed, arXiv, CrossRef, and Semantic Scholar
          </p>
        </div>
        {selectedPapers.length > 0 && (
          <Button onClick={handleAddToCitations}>
            Add {selectedPapers.length} to Citations
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {/* Search Interface */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter search terms (e.g., 'machine learning healthcare')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Stats */}
          {searchStats.totalResults > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Total Results</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {searchStats.totalResults}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Search Time</div>
                    <div className="text-2xl font-bold text-green-600">
                      {(searchStats.searchTime / 1000).toFixed(1)}s
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Sources</div>
                    <div className="text-sm space-y-1">
                      {Object.entries(searchStats.sourceBreakdown).map(([source, count]) => (
                        <div key={source} className="flex justify-between">
                          <span>{source}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Selected</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedPapers.length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((paper) => (
                <Card key={paper.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedPapers.includes(paper.id)}
                        onCheckedChange={() => handlePaperSelection(paper.id)}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-lg leading-tight">
                            {paper.title}
                          </h3>
                          <div className="flex gap-2 ml-4">
                            <Badge variant="outline">{paper.database}</Badge>
                            <Badge 
                              variant={paper.peerReviewed ? "default" : "secondary"}
                            >
                              {paper.peerReviewed ? 'Peer Reviewed' : 'Preprint'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {paper.authors.slice(0, 3).join(', ')}
                            {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {paper.year}
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {paper.source}
                          </div>
                          {paper.citationCount && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {paper.citationCount} citations
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Credibility:</span>
                            <span className={`text-xs font-bold ${getCredibilityColor(paper.credibilityScore)}`}>
                              {getCredibilityLabel(paper.credibilityScore)} ({(paper.credibilityScore * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={paper.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </a>
                            </Button>
                            {paper.doi && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                                  DOI
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>

                        {paper.abstract && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                              Show Abstract
                            </summary>
                            <p className="mt-2 text-muted-foreground leading-relaxed">
                              {paper.abstract}
                            </p>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Filters</CardTitle>
              <CardDescription>
                Customize your search parameters for more precise results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Sources */}
              <div>
                <h4 className="font-medium mb-3">Data Sources</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'pubmed', label: 'PubMed', description: 'Biomedical literature' },
                    { id: 'arxiv', label: 'arXiv', description: 'Physics, math, CS preprints' },
                    { id: 'crossref', label: 'CrossRef', description: 'Scholarly publications' },
                    { id: 'semanticScholar', label: 'Semantic Scholar', description: 'AI-powered search' }
                  ].map((source) => (
                    <div key={source.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={source.id}
                        checked={filters.sources.includes(source.id)}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            sources: checked
                              ? [...prev.sources, source.id]
                              : prev.sources.filter(s => s !== source.id)
                          }));
                        }}
                      />
                      <div>
                        <label htmlFor={source.id} className="text-sm font-medium">
                          {source.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {source.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Year Range */}
              <div>
                <h4 className="font-medium mb-3">Publication Year</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">From</label>
                    <Input
                      type="number"
                      placeholder="2020"
                      value={filters.yearFrom || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        yearFrom: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To</label>
                    <Input
                      type="number"
                      placeholder="2024"
                      value={filters.yearTo || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        yearTo: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Source Type & Sort */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Source Type</label>
                  <Select
                    value={filters.sourceType}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sourceType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="journal">Journal Articles</SelectItem>
                      <SelectItem value="preprint">Preprints</SelectItem>
                      <SelectItem value="conference">Conference Papers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="year">Publication Year</SelectItem>
                      <SelectItem value="citations">Citation Count</SelectItem>
                      <SelectItem value="credibility">Credibility Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Credibility Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Minimum Credibility</label>
                  <span className="text-sm text-muted-foreground">
                    {(filters.minCredibility * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[filters.minCredibility]}
                  onValueChange={([value]) => setFilters(prev => ({ ...prev, minCredibility: value }))}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Options */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAbstracts"
                  checked={filters.includeAbstracts}
                  onCheckedChange={(checked) => setFilters(prev => ({ 
                    ...prev, 
                    includeAbstracts: checked as boolean 
                  }))}
                />
                <label htmlFor="includeAbstracts" className="text-sm font-medium">
                  Include abstracts in results
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Analytics</CardTitle>
              <CardDescription>
                Insights about your search results and academic database coverage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <div className="space-y-6">
                  {/* Source Distribution */}
                  <div>
                    <h4 className="font-medium mb-3">Source Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(searchStats.sourceBreakdown).map(([source, count]) => {
                        const percentage = (count / searchStats.totalResults) * 100;
                        return (
                          <div key={source}>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{source}</span>
                              <span>{count} ({percentage.toFixed(0)}%)</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Credibility Analysis */}
                  <div>
                    <h4 className="font-medium mb-3">Credibility Analysis</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {results.filter(p => p.credibilityScore >= 0.8).length}
                        </div>
                        <div className="text-sm text-muted-foreground">High Credibility</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {results.filter(p => p.credibilityScore >= 0.6 && p.credibilityScore < 0.8).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Medium Credibility</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {results.filter(p => p.credibilityScore < 0.6).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Low Credibility</div>
                      </div>
                    </div>
                  </div>

                  {/* Publication Years */}
                  <div>
                    <h4 className="font-medium mb-3">Publication Timeline</h4>
                    <div className="text-sm text-muted-foreground">
                      {results.length > 0 && (
                        <>
                          Oldest: {Math.min(...results.map(p => parseInt(p.year)).filter(y => !isNaN(y)))} | 
                          Newest: {Math.max(...results.map(p => parseInt(p.year)).filter(y => !isNaN(y)))} | 
                          Peer Reviewed: {results.filter(p => p.peerReviewed).length}/{results.length}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Run a search to see analytics about your results
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 