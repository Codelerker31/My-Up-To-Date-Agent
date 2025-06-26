const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class AcademicService {
  constructor() {
    this.isInitialized = false;
    
    // API configurations
    this.apis = {
      pubmed: {
        baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
        apiKey: process.env.NCBI_API_KEY || null,
        rateLimit: 3 // requests per second
      },
      arxiv: {
        baseUrl: 'http://export.arxiv.org/api/query',
        rateLimit: 1 // requests per 3 seconds
      },
      crossref: {
        baseUrl: 'https://api.crossref.org',
        email: process.env.CROSSREF_EMAIL || 'research@example.com',
        rateLimit: 50 // requests per second
      },
      semanticScholar: {
        baseUrl: 'https://api.semanticscholar.org/graph/v1',
        apiKey: process.env.SEMANTIC_SCHOLAR_API_KEY || null,
        rateLimit: 100 // requests per 5 minutes
      }
    };

    // Rate limiting trackers
    this.rateLimits = new Map();
    
    // Cache for search results (5 minutes TTL)
    this.searchCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async initialize() {
    try {
      logger.info('Academic service initializing...');
      
      // Test API connections
      await this.testConnections();
      
      this.isInitialized = true;
      logger.info('Academic service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize academic service:', error);
      throw error;
    }
  }

  async testConnections() {
    const results = {
      pubmed: false,
      arxiv: false,
      crossref: false,
      semanticScholar: false
    };

    try {
      // Test PubMed
      const pubmedTest = await this.searchPubMed('covid', { maxResults: 1 });
      results.pubmed = pubmedTest.length > 0;
    } catch (error) {
      logger.warn('PubMed connection test failed:', error.message);
    }

    try {
      // Test arXiv
      const arxivTest = await this.searchArXiv('machine learning', { maxResults: 1 });
      results.arxiv = arxivTest.length > 0;
    } catch (error) {
      logger.warn('arXiv connection test failed:', error.message);
    }

    try {
      // Test CrossRef
      const crossrefTest = await this.searchCrossRef('artificial intelligence', { rows: 1 });
      results.crossref = crossrefTest.length > 0;
    } catch (error) {
      logger.warn('CrossRef connection test failed:', error.message);
    }

    logger.info('Academic API connections tested:', results);
    return results;
  }

  async searchAcademicSources(query, options = {}) {
    try {
      const {
        sources = ['pubmed', 'arxiv', 'crossref', 'semanticScholar'],
        maxResults = 20,
        yearFrom,
        yearTo,
        sourceType = 'all',
        sortBy = 'relevance',
        includeAbstracts = true
      } = options;

      // Check cache first
      const cacheKey = JSON.stringify({ query, options });
      if (this.searchCache.has(cacheKey)) {
        const cached = this.searchCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          logger.info(`Returning cached results for query: ${query}`);
          return cached.results;
        }
        this.searchCache.delete(cacheKey);
      }

      const searchPromises = [];
      const resultsPerSource = Math.ceil(maxResults / sources.length);

      // Search each enabled source
      if (sources.includes('pubmed')) {
        searchPromises.push(
          this.searchPubMed(query, { 
            maxResults: resultsPerSource, 
            yearFrom, 
            yearTo,
            includeAbstracts 
          }).catch(error => {
            logger.error('PubMed search error:', error);
            return [];
          })
        );
      }

      if (sources.includes('arxiv')) {
        searchPromises.push(
          this.searchArXiv(query, { 
            maxResults: resultsPerSource, 
            yearFrom, 
            yearTo 
          }).catch(error => {
            logger.error('arXiv search error:', error);
            return [];
          })
        );
      }

      if (sources.includes('crossref')) {
        searchPromises.push(
          this.searchCrossRef(query, { 
            rows: resultsPerSource, 
            yearFrom, 
            yearTo 
          }).catch(error => {
            logger.error('CrossRef search error:', error);
            return [];
          })
        );
      }

      if (sources.includes('semanticScholar')) {
        searchPromises.push(
          this.searchSemanticScholar(query, { 
            limit: resultsPerSource, 
            yearFrom, 
            yearTo 
          }).catch(error => {
            logger.error('Semantic Scholar search error:', error);
            return [];
          })
        );
      }

      // Wait for all searches to complete
      const searchResults = await Promise.all(searchPromises);
      
      // Combine and deduplicate results
      let combinedResults = [];
      searchResults.forEach(results => {
        combinedResults = combinedResults.concat(results);
      });

      // Remove duplicates based on DOI or title
      const uniqueResults = this.deduplicateResults(combinedResults);
      
      // Sort results
      const sortedResults = this.sortResults(uniqueResults, sortBy);
      
      // Limit to requested number
      const finalResults = sortedResults.slice(0, maxResults);

      // Cache results
      this.searchCache.set(cacheKey, {
        results: finalResults,
        timestamp: Date.now()
      });

      logger.info(`Academic search completed: ${finalResults.length} results for "${query}"`);
      return finalResults;

    } catch (error) {
      logger.error('Error in academic search:', error);
      throw error;
    }
  }

  async searchPubMed(query, options = {}) {
    try {
      await this.checkRateLimit('pubmed');
      
      const { maxResults = 20, yearFrom, yearTo, includeAbstracts = true } = options;
      
      // Build search query
      let searchQuery = query;
      if (yearFrom || yearTo) {
        const fromYear = yearFrom || '1900';
        const toYear = yearTo || new Date().getFullYear();
        searchQuery += ` AND ("${fromYear}"[Date - Publication] : "${toYear}"[Date - Publication])`;
      }

      // Search for article IDs
      const searchUrl = `${this.apis.pubmed.baseUrl}/esearch.fcgi`;
      const searchParams = {
        db: 'pubmed',
        term: searchQuery,
        retmax: maxResults,
        retmode: 'json',
        sort: 'relevance'
      };

      if (this.apis.pubmed.apiKey) {
        searchParams.api_key = this.apis.pubmed.apiKey;
      }

      const searchResponse = await axios.get(searchUrl, { params: searchParams });
      const idList = searchResponse.data.esearchresult.idlist;

      if (!idList || idList.length === 0) {
        return [];
      }

      // Fetch article details
      const fetchUrl = `${this.apis.pubmed.baseUrl}/efetch.fcgi`;
      const fetchParams = {
        db: 'pubmed',
        id: idList.join(','),
        retmode: 'xml'
      };

      if (this.apis.pubmed.apiKey) {
        fetchParams.api_key = this.apis.pubmed.apiKey;
      }

      const fetchResponse = await axios.get(fetchUrl, { params: fetchParams });
      
      // Parse XML results
      const results = this.parsePubMedXML(fetchResponse.data, includeAbstracts);
      
      logger.info(`PubMed search: ${results.length} results for "${query}"`);
      return results;

    } catch (error) {
      logger.error('PubMed search error:', error);
      return [];
    }
  }

  async searchArXiv(query, options = {}) {
    try {
      await this.checkRateLimit('arxiv');
      
      const { maxResults = 20, yearFrom, yearTo } = options;
      
      // Build search query
      let searchQuery = `all:${query}`;
      
      const searchParams = {
        search_query: searchQuery,
        start: 0,
        max_results: maxResults,
        sortBy: 'relevance',
        sortOrder: 'descending'
      };

      const response = await axios.get(this.apis.arxiv.baseUrl, { params: searchParams });
      
      // Parse XML results
      const results = this.parseArXivXML(response.data, yearFrom, yearTo);
      
      logger.info(`arXiv search: ${results.length} results for "${query}"`);
      return results;

    } catch (error) {
      logger.error('arXiv search error:', error);
      return [];
    }
  }

  async searchCrossRef(query, options = {}) {
    try {
      await this.checkRateLimit('crossref');
      
      const { rows = 20, yearFrom, yearTo } = options;
      
      const searchParams = {
        query: query,
        rows: rows,
        mailto: this.apis.crossref.email
      };

      if (yearFrom) {
        searchParams['filter'] = `from-pub-date:${yearFrom}`;
      }
      if (yearTo) {
        const existingFilter = searchParams['filter'] || '';
        searchParams['filter'] = existingFilter ? `${existingFilter},until-pub-date:${yearTo}` : `until-pub-date:${yearTo}`;
      }

      const response = await axios.get(`${this.apis.crossref.baseUrl}/works`, { params: searchParams });
      
      const results = this.parseCrossRefResults(response.data.message.items);
      
      logger.info(`CrossRef search: ${results.length} results for "${query}"`);
      return results;

    } catch (error) {
      logger.error('CrossRef search error:', error);
      return [];
    }
  }

  async searchSemanticScholar(query, options = {}) {
    try {
      await this.checkRateLimit('semanticScholar');
      
      const { limit = 20, yearFrom, yearTo } = options;
      
      const searchParams = {
        query: query,
        limit: limit,
        fields: 'paperId,title,authors,year,abstract,citationCount,url,venue,publicationDate'
      };

      if (yearFrom) {
        searchParams.year = `${yearFrom}-`;
      }
      if (yearTo) {
        searchParams.year = yearFrom ? `${yearFrom}-${yearTo}` : `-${yearTo}`;
      }

      const headers = {};
      if (this.apis.semanticScholar.apiKey) {
        headers['x-api-key'] = this.apis.semanticScholar.apiKey;
      }

      const response = await axios.get(`${this.apis.semanticScholar.baseUrl}/paper/search`, { 
        params: searchParams,
        headers 
      });
      
      const results = this.parseSemanticScholarResults(response.data.data);
      
      logger.info(`Semantic Scholar search: ${results.length} results for "${query}"`);
      return results;

    } catch (error) {
      logger.error('Semantic Scholar search error:', error);
      return [];
    }
  }

  parsePubMedXML(xmlData, includeAbstracts = true) {
    const results = [];
    
    try {
      const $ = cheerio.load(xmlData, { xmlMode: true });
      
      $('PubmedArticle').each((index, article) => {
        const $article = $(article);
        
        const pmid = $article.find('PMID').first().text();
        const title = $article.find('ArticleTitle').text();
        const abstract = includeAbstracts ? $article.find('AbstractText').text() : '';
        
        // Extract authors
        const authors = [];
        $article.find('Author').each((i, author) => {
          const $author = $(author);
          const lastName = $author.find('LastName').text();
          const foreName = $author.find('ForeName').text();
          if (lastName && foreName) {
            authors.push(`${foreName} ${lastName}`);
          }
        });
        
        // Extract publication info
        const journal = $article.find('Title').first().text();
        const pubDate = $article.find('PubDate');
        const year = pubDate.find('Year').text() || pubDate.find('MedlineDate').text().match(/\d{4}/)?.[0] || '';
        
        // Extract DOI
        const doi = $article.find('ArticleId[IdType="doi"]').text();
        
        if (title && authors.length > 0) {
          results.push({
            id: pmid,
            title: title.trim(),
            authors: authors,
            source: journal.trim(),
            year: year,
            abstract: abstract.trim(),
            url: doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
            sourceType: 'journal',
            database: 'PubMed',
            doi: doi,
            citationCount: null, // Not available from PubMed
            credibilityScore: 0.9, // High credibility for PubMed
            peerReviewed: true
          });
        }
      });
    } catch (error) {
      logger.error('Error parsing PubMed XML:', error);
    }
    
    return results;
  }

  parseArXivXML(xmlData, yearFrom, yearTo) {
    const results = [];
    
    try {
      const $ = cheerio.load(xmlData, { xmlMode: true });
      
      $('entry').each((index, entry) => {
        const $entry = $(entry);
        
        const id = $entry.find('id').text();
        const title = $entry.find('title').text();
        const summary = $entry.find('summary').text();
        const published = $entry.find('published').text();
        const year = new Date(published).getFullYear().toString();
        
        // Filter by year if specified
        if (yearFrom && parseInt(year) < parseInt(yearFrom)) return;
        if (yearTo && parseInt(year) > parseInt(yearTo)) return;
        
        // Extract authors
        const authors = [];
        $entry.find('author name').each((i, author) => {
          authors.push($(author).text());
        });
        
        // Extract categories
        const categories = [];
        $entry.find('category').each((i, cat) => {
          categories.push($(cat).attr('term'));
        });
        
        if (title && authors.length > 0) {
          results.push({
            id: id.split('/').pop(),
            title: title.trim(),
            authors: authors,
            source: 'arXiv',
            year: year,
            abstract: summary.trim(),
            url: id,
            sourceType: 'preprint',
            database: 'arXiv',
            doi: null,
            citationCount: null,
            credibilityScore: 0.7, // Lower credibility for preprints
            peerReviewed: false,
            categories: categories
          });
        }
      });
    } catch (error) {
      logger.error('Error parsing arXiv XML:', error);
    }
    
    return results;
  }

  parseCrossRefResults(items) {
    const results = [];
    
    try {
      items.forEach(item => {
        const title = item.title?.[0];
        const authors = item.author?.map(author => 
          `${author.given || ''} ${author.family || ''}`.trim()
        ) || [];
        
        const journal = item['container-title']?.[0] || '';
        const year = item.published?.['date-parts']?.[0]?.[0]?.toString() || '';
        const doi = item.DOI;
        const abstract = item.abstract || '';
        
        if (title && authors.length > 0) {
          results.push({
            id: doi || item.URL,
            title: title.trim(),
            authors: authors,
            source: journal,
            year: year,
            abstract: abstract,
            url: doi ? `https://doi.org/${doi}` : item.URL,
            sourceType: 'journal',
            database: 'CrossRef',
            doi: doi,
            citationCount: item['is-referenced-by-count'] || null,
            credibilityScore: 0.85, // High credibility for CrossRef
            peerReviewed: true
          });
        }
      });
    } catch (error) {
      logger.error('Error parsing CrossRef results:', error);
    }
    
    return results;
  }

  parseSemanticScholarResults(papers) {
    const results = [];
    
    try {
      papers.forEach(paper => {
        const authors = paper.authors?.map(author => author.name) || [];
        
        if (paper.title && authors.length > 0) {
          results.push({
            id: paper.paperId,
            title: paper.title.trim(),
            authors: authors,
            source: paper.venue || 'Unknown',
            year: paper.year?.toString() || '',
            abstract: paper.abstract || '',
            url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
            sourceType: 'journal',
            database: 'Semantic Scholar',
            doi: null,
            citationCount: paper.citationCount || 0,
            credibilityScore: this.calculateSemanticScholarCredibility(paper),
            peerReviewed: true // Assume peer-reviewed for Semantic Scholar
          });
        }
      });
    } catch (error) {
      logger.error('Error parsing Semantic Scholar results:', error);
    }
    
    return results;
  }

  calculateSemanticScholarCredibility(paper) {
    let score = 0.7; // Base score
    
    // Boost for citation count
    if (paper.citationCount > 100) score += 0.2;
    else if (paper.citationCount > 50) score += 0.15;
    else if (paper.citationCount > 10) score += 0.1;
    
    // Boost for recent papers
    const currentYear = new Date().getFullYear();
    if (paper.year && currentYear - paper.year <= 3) score += 0.05;
    
    // Boost for well-known venues
    const topVenues = ['Nature', 'Science', 'Cell', 'NEJM', 'Lancet'];
    if (paper.venue && topVenues.some(venue => paper.venue.includes(venue))) {
      score += 0.15;
    }
    
    return Math.min(1.0, score);
  }

  deduplicateResults(results) {
    const seen = new Set();
    const unique = [];
    
    results.forEach(result => {
      // Create a key based on DOI or normalized title
      const key = result.doi || result.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    });
    
    return unique;
  }

  sortResults(results, sortBy) {
    switch (sortBy) {
      case 'year':
        return results.sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));
      case 'citations':
        return results.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
      case 'credibility':
        return results.sort((a, b) => b.credibilityScore - a.credibilityScore);
      case 'relevance':
      default:
        return results; // Assume already sorted by relevance from APIs
    }
  }

  async checkRateLimit(service) {
    const now = Date.now();
    const limit = this.apis[service].rateLimit;
    
    if (!this.rateLimits.has(service)) {
      this.rateLimits.set(service, { requests: [], limit });
    }
    
    const tracker = this.rateLimits.get(service);
    
    // Remove old requests (older than 1 second for most APIs)
    const timeWindow = service === 'arxiv' ? 3000 : 1000; // 3 seconds for arXiv, 1 second for others
    tracker.requests = tracker.requests.filter(time => now - time < timeWindow);
    
    // Check if we're at the limit
    if (tracker.requests.length >= limit) {
      const oldestRequest = Math.min(...tracker.requests);
      const waitTime = timeWindow - (now - oldestRequest);
      
      if (waitTime > 0) {
        logger.info(`Rate limiting ${service}: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Add current request
    tracker.requests.push(now);
  }

  async getFullTextAvailability(papers) {
    // Check for full-text availability across different sources
    const results = [];
    
    for (const paper of papers) {
      const availability = {
        ...paper,
        fullTextSources: []
      };
      
      // Check DOI link
      if (paper.doi) {
        availability.fullTextSources.push({
          type: 'publisher',
          url: `https://doi.org/${paper.doi}`,
          accessType: 'subscription'
        });
      }
      
      // Check arXiv for preprints
      if (paper.database === 'arXiv') {
        availability.fullTextSources.push({
          type: 'preprint',
          url: paper.url,
          accessType: 'open'
        });
      }
      
      // Check PubMed Central for open access
      if (paper.database === 'PubMed') {
        // This would require additional API calls to check PMC availability
        // For now, we'll mark it as potentially available
        availability.fullTextSources.push({
          type: 'repository',
          url: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${paper.id}/`,
          accessType: 'open',
          note: 'Check PMC for availability'
        });
      }
      
      results.push(availability);
    }
    
    return results;
  }

  async cleanup() {
    try {
      // Clear caches
      this.searchCache.clear();
      this.rateLimits.clear();
      
      logger.info('Academic service cleaned up');
    } catch (error) {
      logger.error('Error cleaning up academic service:', error);
    }
  }
}

module.exports = AcademicService; 