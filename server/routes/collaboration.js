const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Create collaborative project
router.post('/projects', async (req, res) => {
  try {
    const { streamId, collaborators = [], permissions = {} } = req.body;
    const ownerId = req.user?.id; // Assuming auth middleware sets req.user

    if (!ownerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!streamId) {
      return res.status(400).json({ error: 'Stream ID is required' });
    }

    const collaborationService = req.app.get('collaborationService');
    if (!collaborationService) {
      return res.status(503).json({ error: 'Collaboration service not available' });
    }

    const collaboration = await collaborationService.createCollaborativeProject(ownerId, {
      streamId,
      collaborators,
      permissions
    });

    res.status(201).json({
      success: true,
      collaboration
    });

  } catch (error) {
    logger.error('Create collaborative project error:', error);
    res.status(500).json({ 
      error: 'Failed to create collaborative project',
      details: error.message 
    });
  }
});

// Get collaboration details
router.get('/projects/:collaborationId', async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const collaborationService = req.app.get('collaborationService');
    const databaseService = req.app.get('databaseService');
    
    if (!collaborationService || !databaseService) {
      return res.status(503).json({ error: 'Required services not available' });
    }

    // Check if user has access to this collaboration
    const collaborator = await databaseService.getCollaborator(collaborationId, userId);
    if (!collaborator) {
      return res.status(403).json({ error: 'Access denied to this collaboration' });
    }

    const collaboration = await databaseService.getCollaborationById(collaborationId);
    const collaborators = await databaseService.getCollaborators(collaborationId);
    const documents = await databaseService.getSharedDocuments(collaborationId);
    const bibliography = await databaseService.getSharedBibliography(collaborationId);

    res.json({
      success: true,
      collaboration,
      collaborators,
      documents,
      bibliography,
      userRole: collaborator.role,
      userPermissions: collaborator.permissions
    });

  } catch (error) {
    logger.error('Get collaboration error:', error);
    res.status(500).json({ 
      error: 'Failed to get collaboration details',
      details: error.message 
    });
  }
});

// Invite collaborator
router.post('/projects/:collaborationId/invite', async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const { email, role = 'viewer' } = req.body;
    const inviterId = req.user?.id;

    if (!inviterId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const collaborationService = req.app.get('collaborationService');
    if (!collaborationService) {
      return res.status(503).json({ error: 'Collaboration service not available' });
    }

    const invitation = await collaborationService.inviteCollaborator(
      collaborationId,
      inviterId,
      email,
      role
    );

    res.status(201).json({
      success: true,
      invitation
    });

  } catch (error) {
    logger.error('Invite collaborator error:', error);
    res.status(500).json({ 
      error: 'Failed to invite collaborator',
      details: error.message 
    });
  }
});

// Accept invitation
router.post('/invitations/:invitationId/accept', async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const collaborationService = req.app.get('collaborationService');
    if (!collaborationService) {
      return res.status(503).json({ error: 'Collaboration service not available' });
    }

    const collaborator = await collaborationService.acceptInvitation(invitationId, userId);

    res.json({
      success: true,
      collaborator,
      message: 'Invitation accepted successfully'
    });

  } catch (error) {
    logger.error('Accept invitation error:', error);
    res.status(500).json({ 
      error: 'Failed to accept invitation',
      details: error.message 
    });
  }
});

// Update shared document
router.put('/projects/:collaborationId/documents/:documentType', async (req, res) => {
  try {
    const { collaborationId, documentType } = req.params;
    const { updates } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!updates) {
      return res.status(400).json({ error: 'Updates are required' });
    }

    const collaborationService = req.app.get('collaborationService');
    if (!collaborationService) {
      return res.status(503).json({ error: 'Collaboration service not available' });
    }

    const document = await collaborationService.updateSharedDocument(
      collaborationId,
      userId,
      documentType,
      updates
    );

    res.json({
      success: true,
      document
    });

  } catch (error) {
    logger.error('Update shared document error:', error);
    res.status(500).json({ 
      error: 'Failed to update shared document',
      details: error.message 
    });
  }
});

// Add shared citation
router.post('/projects/:collaborationId/citations', async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const citationData = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const collaborationService = req.app.get('collaborationService');
    if (!collaborationService) {
      return res.status(503).json({ error: 'Collaboration service not available' });
    }

    const citation = await collaborationService.addSharedCitation(
      collaborationId,
      userId,
      citationData
    );

    res.status(201).json({
      success: true,
      citation
    });

  } catch (error) {
    logger.error('Add shared citation error:', error);
    res.status(500).json({ 
      error: 'Failed to add shared citation',
      details: error.message 
    });
  }
});

// Add comment
router.post('/projects/:collaborationId/comments', async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const commentData = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!commentData.content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const collaborationService = req.app.get('collaborationService');
    if (!collaborationService) {
      return res.status(503).json({ error: 'Collaboration service not available' });
    }

    const comment = await collaborationService.addComment(
      collaborationId,
      userId,
      commentData
    );

    res.status(201).json({
      success: true,
      comment
    });

  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({ 
      error: 'Failed to add comment',
      details: error.message 
    });
  }
});

// Update collaborator permissions
router.put('/projects/:collaborationId/collaborators/:targetUserId/permissions', async (req, res) => {
  try {
    const { collaborationId, targetUserId } = req.params;
    const { role } = req.body;
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const collaborationService = req.app.get('collaborationService');
    if (!collaborationService) {
      return res.status(503).json({ error: 'Collaboration service not available' });
    }

    const collaborator = await collaborationService.updateCollaboratorPermissions(
      collaborationId,
      adminUserId,
      targetUserId,
      role
    );

    res.json({
      success: true,
      collaborator
    });

  } catch (error) {
    logger.error('Update permissions error:', error);
    res.status(500).json({ 
      error: 'Failed to update permissions',
      details: error.message 
    });
  }
});

// Get collaboration activity
router.get('/projects/:collaborationId/activity', async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const { 
      limit = 50, 
      offset = 0, 
      activityType,
      dateFrom,
      dateTo 
    } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const collaborationService = req.app.get('collaborationService');
    if (!collaborationService) {
      return res.status(503).json({ error: 'Collaboration service not available' });
    }

    const activities = await collaborationService.getCollaborationActivity(
      collaborationId,
      userId,
      {
        limit: parseInt(limit),
        offset: parseInt(offset),
        activityType,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined
      }
    );

    res.json({
      success: true,
      activities,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Get collaboration activity error:', error);
    res.status(500).json({ 
      error: 'Failed to get collaboration activity',
      details: error.message 
    });
  }
});

// Get version history
router.get('/projects/:collaborationId/documents/:documentType/versions', async (req, res) => {
  try {
    const { collaborationId, documentType } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const collaborationService = req.app.get('collaborationService');
    if (!collaborationService) {
      return res.status(503).json({ error: 'Collaboration service not available' });
    }

    const versions = await collaborationService.getVersionHistory(
      collaborationId,
      userId,
      documentType
    );

    res.json({
      success: true,
      documentType,
      versions
    });

  } catch (error) {
    logger.error('Get version history error:', error);
    res.status(500).json({ 
      error: 'Failed to get version history',
      details: error.message 
    });
  }
});

// Export collaborative project
router.post('/projects/:collaborationId/export', async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const { format = 'markdown' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const collaborationService = req.app.get('collaborationService');
    if (!collaborationService) {
      return res.status(503).json({ error: 'Collaboration service not available' });
    }

    const exportData = await collaborationService.exportCollaborativeProject(
      collaborationId,
      userId,
      format
    );

    // Set appropriate headers for file download
    res.setHeader('Content-Type', exportData.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);

    if (format === 'pdf' && exportData.buffer) {
      res.send(exportData.buffer);
    } else {
      res.send(exportData.content);
    }

  } catch (error) {
    logger.error('Export collaborative project error:', error);
    res.status(500).json({ 
      error: 'Failed to export collaborative project',
      details: error.message 
    });
  }
});

// Get user's collaborations
router.get('/user/projects', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const databaseService = req.app.get('databaseService');
    if (!databaseService) {
      return res.status(503).json({ error: 'Database service not available' });
    }

    const collaborations = await databaseService.getUserCollaborations(userId);

    res.json({
      success: true,
      collaborations
    });

  } catch (error) {
    logger.error('Get user collaborations error:', error);
    res.status(500).json({ 
      error: 'Failed to get user collaborations',
      details: error.message 
    });
  }
});

// Get pending invitations
router.get('/user/invitations', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const databaseService = req.app.get('databaseService');
    if (!databaseService) {
      return res.status(503).json({ error: 'Database service not available' });
    }

    const invitations = await databaseService.getUserInvitations(userId);

    res.json({
      success: true,
      invitations
    });

  } catch (error) {
    logger.error('Get user invitations error:', error);
    res.status(500).json({ 
      error: 'Failed to get user invitations',
      details: error.message 
    });
  }
});

// Decline invitation
router.post('/invitations/:invitationId/decline', async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const databaseService = req.app.get('databaseService');
    if (!databaseService) {
      return res.status(503).json({ error: 'Database service not available' });
    }

    await databaseService.updateCollaborationInvitation(invitationId, {
      status: 'declined',
      declined_at: new Date()
    });

    res.json({
      success: true,
      message: 'Invitation declined'
    });

  } catch (error) {
    logger.error('Decline invitation error:', error);
    res.status(500).json({ 
      error: 'Failed to decline invitation',
      details: error.message 
    });
  }
});

// Leave collaboration
router.delete('/projects/:collaborationId/leave', async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const databaseService = req.app.get('databaseService');
    const collaborationService = req.app.get('collaborationService');
    
    if (!databaseService || !collaborationService) {
      return res.status(503).json({ error: 'Required services not available' });
    }

    // Check if user is owner (owners cannot leave)
    const collaborator = await databaseService.getCollaborator(collaborationId, userId);
    if (collaborator.role === 'owner') {
      return res.status(400).json({ error: 'Project owners cannot leave. Transfer ownership first.' });
    }

    // Remove collaborator
    await databaseService.removeCollaborator(collaborationId, userId);

    // Notify other collaborators
    await collaborationService.notifyCollaborators(collaborationId, {
      type: 'user-left',
      userId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Successfully left collaboration'
    });

  } catch (error) {
    logger.error('Leave collaboration error:', error);
    res.status(500).json({ 
      error: 'Failed to leave collaboration',
      details: error.message 
    });
  }
});

module.exports = router; 