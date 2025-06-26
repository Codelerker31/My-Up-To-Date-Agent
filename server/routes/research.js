const express = require('express');
const router = express.Router();

// Research routes for academic projects and citations
module.exports = (researchService, authService) => {
  // Get available research project templates
  router.get('/templates', authService.authenticateToken, async (req, res) => {
    try {
      const templates = await researchService.getProjectTemplates();
      
      res.json({
        success: true,
        templates
      });
    } catch (error) {
      console.error('Error getting project templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get project templates'
      });
    }
  });

  // Create a new research project
  router.post('/projects', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { title, description, template, category, priority, frequency, collaboration, exportFormat } = req.body;

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: 'Title and description are required'
        });
      }

      const projectData = {
        title,
        description,
        template: template || 'personal',
        category,
        priority,
        frequency,
        collaboration,
        exportFormat
      };

      const result = await researchService.createResearchProject(userId, projectData);
      
      res.json({
        success: true,
        project: result,
        message: 'Research project created successfully'
      });
    } catch (error) {
      console.error('Error creating research project:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create research project'
      });
    }
  });

  // Get research project statistics
  router.get('/projects/:streamId/statistics', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);
      
      const statistics = await researchService.getResearchStatistics(userId, streamId);
      
      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      console.error('Error getting research statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get research statistics'
      });
    }
  });

  // Add citation to research project
  router.post('/projects/:streamId/citations', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);
      const citationData = req.body;

      if (!citationData.title || !citationData.authors || !citationData.source) {
        return res.status(400).json({
          success: false,
          error: 'Title, authors, and source are required for citation'
        });
      }

      const citation = await researchService.addCitation(userId, streamId, citationData);
      
      res.json({
        success: true,
        citation,
        message: 'Citation added successfully'
      });
    } catch (error) {
      console.error('Error adding citation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add citation'
      });
    }
  });

  // Get citations for a research project
  router.get('/projects/:streamId/citations', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);
      
      // Validate stream ownership (this would be implemented in the service)
      const citations = await researchService.getCitationsByProject(streamId);
      
      res.json({
        success: true,
        citations
      });
    } catch (error) {
      console.error('Error getting citations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get citations'
      });
    }
  });

  // Search academic sources
  router.get('/sources/search', authService.authenticateToken, async (req, res) => {
    try {
      const { query, sourceType, limit, yearFrom, yearTo } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const options = {
        sourceType,
        limit: parseInt(limit) || 20,
        yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
        yearTo: yearTo ? parseInt(yearTo) : undefined
      };

      const sources = await researchService.searchAcademicSources(query, options);
      
      res.json({
        success: true,
        sources,
        query,
        options
      });
    } catch (error) {
      console.error('Error searching academic sources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search academic sources'
      });
    }
  });

  // Generate research report
  router.post('/projects/:streamId/report', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);
      const { format = 'markdown' } = req.body;

      const report = await researchService.generateResearchReport(userId, streamId, format);
      
      // Set appropriate headers for file download
      res.setHeader('Content-Type', report.mimeType || 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      
      if (format === 'pdf') {
        res.send(report.buffer);
      } else {
        res.send(report.content);
      }
    } catch (error) {
      console.error('Error generating research report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate research report'
      });
    }
  });

  // Get research report preview (without download)
  router.get('/projects/:streamId/report/preview', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);
      const { format = 'markdown' } = req.query;

      const report = await researchService.generateResearchReport(userId, streamId, format);
      
      res.json({
        success: true,
        report: {
          filename: report.filename,
          content: format === 'markdown' ? report.content : 'Binary content',
          size: report.content ? report.content.length : report.buffer?.length || 0,
          format
        }
      });
    } catch (error) {
      console.error('Error generating report preview:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate report preview'
      });
    }
  });

  // Update citation
  router.put('/citations/:citationId', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const citationId = parseInt(req.params.citationId);
      const updateData = req.body;

      // This would be implemented in the service
      const updatedCitation = await researchService.updateCitation(userId, citationId, updateData);
      
      res.json({
        success: true,
        citation: updatedCitation,
        message: 'Citation updated successfully'
      });
    } catch (error) {
      console.error('Error updating citation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update citation'
      });
    }
  });

  // Delete citation
  router.delete('/citations/:citationId', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const citationId = parseInt(req.params.citationId);

      // This would be implemented in the service
      await researchService.deleteCitation(userId, citationId);
      
      res.json({
        success: true,
        message: 'Citation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting citation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete citation'
      });
    }
  });

  // Get bibliography for a research project
  router.get('/projects/:streamId/bibliography', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);
      const { style = 'apa' } = req.query;

      // This would be implemented in the service
      const bibliography = await researchService.getBibliography(streamId, style);
      
      res.json({
        success: true,
        bibliography
      });
    } catch (error) {
      console.error('Error getting bibliography:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get bibliography'
      });
    }
  });

  // Export bibliography in various formats
  router.get('/projects/:streamId/bibliography/export', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);
      const { format = 'bibtex', style = 'apa' } = req.query;

      // This would be implemented in the service
      const exportedBibliography = await researchService.exportBibliography(streamId, format, style);
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="bibliography.${format}"`);
      res.send(exportedBibliography);
    } catch (error) {
      console.error('Error exporting bibliography:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export bibliography'
      });
    }
  });

  // Get research project outline/structure
  router.get('/projects/:streamId/outline', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);

      // This would be implemented in the service
      const outline = await researchService.getResearchOutline(streamId);
      
      res.json({
        success: true,
        outline
      });
    } catch (error) {
      console.error('Error getting research outline:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get research outline'
      });
    }
  });

  // Update research project outline
  router.put('/projects/:streamId/outline', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);
      const { outline } = req.body;

      if (!outline || !Array.isArray(outline)) {
        return res.status(400).json({
          success: false,
          error: 'Valid outline array is required'
        });
      }

      // This would be implemented in the service
      const updatedOutline = await researchService.updateResearchOutline(streamId, outline);
      
      res.json({
        success: true,
        outline: updatedOutline,
        message: 'Research outline updated successfully'
      });
    } catch (error) {
      console.error('Error updating research outline:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update research outline'
      });
    }
  });

  return router;
}; 