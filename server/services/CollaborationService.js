const logger = require('../utils/logger');

class CollaborationService {
  constructor(databaseService, socketIo) {
    this.db = databaseService;
    this.io = socketIo;
    this.isInitialized = false;
    
    // Active collaboration sessions
    this.activeSessions = new Map();
    
    // Permission levels
    this.permissions = {
      owner: ['read', 'write', 'admin', 'delete', 'invite'],
      editor: ['read', 'write', 'comment'],
      reviewer: ['read', 'comment'],
      viewer: ['read']
    };
    
    // Real-time collaboration events
    this.collaborationEvents = [
      'user-joined',
      'user-left', 
      'content-updated',
      'citation-added',
      'citation-updated',
      'comment-added',
      'permission-changed'
    ];
  }

  async initialize() {
    try {
      logger.info('Collaboration service initializing...');
      
      // Set up WebSocket event handlers
      this.setupWebSocketHandlers();
      
      this.isInitialized = true;
      logger.info('Collaboration service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize collaboration service:', error);
      throw error;
    }
  }

  setupWebSocketHandlers() {
    // Handle collaboration events through the main socket.io instance
    // These would be integrated into the main server socket handlers
    logger.info('Collaboration WebSocket handlers configured');
  }

  async createCollaborativeProject(ownerId, projectData) {
    try {
      const { streamId, collaborators = [], permissions = {} } = projectData;
      
      // Create collaboration record
      const collaboration = await this.db.createCollaboration({
        stream_id: streamId,
        owner_id: ownerId,
        is_active: true,
        collaboration_type: 'research_project',
        settings: {
          allowComments: true,
          allowSuggestions: true,
          autoSave: true,
          versionControl: true
        }
      });

      // Add owner with full permissions
      await this.db.addCollaborator({
        collaboration_id: collaboration.id,
        user_id: ownerId,
        role: 'owner',
        permissions: this.permissions.owner,
        invited_by: ownerId,
        status: 'active'
      });

      // Add initial collaborators
      for (const collaborator of collaborators) {
        await this.inviteCollaborator(
          collaboration.id, 
          ownerId, 
          collaborator.email, 
          collaborator.role || 'viewer'
        );
      }

      // Create collaboration workspace
      await this.initializeCollaborationWorkspace(collaboration.id, streamId);

      logger.info(`Created collaborative project ${collaboration.id} for stream ${streamId}`);
      return collaboration;

    } catch (error) {
      logger.error('Error creating collaborative project:', error);
      throw error;
    }
  }

  async initializeCollaborationWorkspace(collaborationId, streamId) {
    try {
      // Create shared document structure
      await this.db.createSharedDocument({
        collaboration_id: collaborationId,
        stream_id: streamId,
        document_type: 'research_outline',
        content: {},
        version: 1,
        last_modified_by: null
      });

      // Create shared bibliography
      await this.db.createSharedBibliography({
        collaboration_id: collaborationId,
        stream_id: streamId,
        citations: [],
        citation_style: 'apa',
        version: 1
      });

      // Create activity log
      await this.db.createActivityLog({
        collaboration_id: collaborationId,
        activity_type: 'workspace_created',
        description: 'Collaboration workspace initialized',
        metadata: {}
      });

      logger.info(`Initialized collaboration workspace for ${collaborationId}`);
    } catch (error) {
      logger.error('Error initializing collaboration workspace:', error);
      throw error;
    }
  }

  async inviteCollaborator(collaborationId, inviterId, email, role = 'viewer') {
    try {
      // Validate permissions
      const inviter = await this.db.getCollaborator(collaborationId, inviterId);
      if (!inviter || !inviter.permissions.includes('invite')) {
        throw new Error('Insufficient permissions to invite collaborators');
      }

      // Check if user exists
      let user = await this.db.getUserByEmail(email);
      
      // Create invitation
      const invitation = await this.db.createCollaborationInvitation({
        collaboration_id: collaborationId,
        invited_email: email,
        invited_user_id: user?.id || null,
        invited_by: inviterId,
        role: role,
        permissions: this.permissions[role],
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      // Send invitation email
      await this.sendInvitationEmail(invitation, email);

      // If user exists, send real-time notification
      if (user) {
        this.io.to(`user-${user.id}`).emit('collaboration-invitation', {
          invitation,
          collaboration: await this.db.getCollaborationById(collaborationId)
        });
      }

      logger.info(`Invited ${email} to collaboration ${collaborationId} as ${role}`);
      return invitation;

    } catch (error) {
      logger.error('Error inviting collaborator:', error);
      throw error;
    }
  }

  async acceptInvitation(invitationId, userId) {
    try {
      const invitation = await this.db.getCollaborationInvitation(invitationId);
      
      if (!invitation || invitation.status !== 'pending') {
        throw new Error('Invalid or expired invitation');
      }

      if (invitation.expires_at < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Add user as collaborator
      const collaborator = await this.db.addCollaborator({
        collaboration_id: invitation.collaboration_id,
        user_id: userId,
        role: invitation.role,
        permissions: invitation.permissions,
        invited_by: invitation.invited_by,
        status: 'active'
      });

      // Update invitation status
      await this.db.updateCollaborationInvitation(invitationId, {
        status: 'accepted',
        accepted_at: new Date()
      });

      // Notify other collaborators
      await this.notifyCollaborators(invitation.collaboration_id, {
        type: 'user-joined',
        userId: userId,
        role: invitation.role,
        timestamp: new Date()
      });

      // Log activity
      await this.db.createActivityLog({
        collaboration_id: invitation.collaboration_id,
        user_id: userId,
        activity_type: 'user_joined',
        description: `User joined as ${invitation.role}`,
        metadata: { invitationId }
      });

      logger.info(`User ${userId} accepted invitation to collaboration ${invitation.collaboration_id}`);
      return collaborator;

    } catch (error) {
      logger.error('Error accepting invitation:', error);
      throw error;
    }
  }

  async updateSharedDocument(collaborationId, userId, documentType, updates) {
    try {
      // Validate permissions
      const collaborator = await this.db.getCollaborator(collaborationId, userId);
      if (!collaborator || !collaborator.permissions.includes('write')) {
        throw new Error('Insufficient permissions to edit document');
      }

      // Get current document
      const document = await this.db.getSharedDocument(collaborationId, documentType);
      
      // Apply updates
      const updatedContent = this.mergeDocumentUpdates(document.content, updates);
      
      // Save new version
      const newVersion = await this.db.updateSharedDocument(document.id, {
        content: updatedContent,
        version: document.version + 1,
        last_modified_by: userId,
        last_modified_at: new Date()
      });

      // Create version history entry
      await this.db.createDocumentVersion({
        document_id: document.id,
        version: newVersion.version,
        content: updatedContent,
        changes: updates,
        modified_by: userId,
        change_summary: this.generateChangeSummary(updates)
      });

      // Notify collaborators in real-time
      await this.notifyCollaborators(collaborationId, {
        type: 'content-updated',
        documentType,
        updates,
        userId,
        version: newVersion.version,
        timestamp: new Date()
      }, userId); // Exclude the user who made the change

      // Log activity
      await this.db.createActivityLog({
        collaboration_id: collaborationId,
        user_id: userId,
        activity_type: 'document_updated',
        description: `Updated ${documentType}`,
        metadata: { documentType, version: newVersion.version }
      });

      logger.info(`Document ${documentType} updated in collaboration ${collaborationId} by user ${userId}`);
      return newVersion;

    } catch (error) {
      logger.error('Error updating shared document:', error);
      throw error;
    }
  }

  async addSharedCitation(collaborationId, userId, citationData) {
    try {
      // Validate permissions
      const collaborator = await this.db.getCollaborator(collaborationId, userId);
      if (!collaborator || !collaborator.permissions.includes('write')) {
        throw new Error('Insufficient permissions to add citations');
      }

      // Add citation to shared bibliography
      const citation = await this.db.addSharedCitation({
        collaboration_id: collaborationId,
        added_by: userId,
        ...citationData
      });

      // Update shared bibliography version
      await this.db.incrementBibliographyVersion(collaborationId);

      // Notify collaborators
      await this.notifyCollaborators(collaborationId, {
        type: 'citation-added',
        citation,
        userId,
        timestamp: new Date()
      }, userId);

      // Log activity
      await this.db.createActivityLog({
        collaboration_id: collaborationId,
        user_id: userId,
        activity_type: 'citation_added',
        description: `Added citation: ${citation.title}`,
        metadata: { citationId: citation.id }
      });

      logger.info(`Citation added to collaboration ${collaborationId} by user ${userId}`);
      return citation;

    } catch (error) {
      logger.error('Error adding shared citation:', error);
      throw error;
    }
  }

  async addComment(collaborationId, userId, commentData) {
    try {
      // Validate permissions
      const collaborator = await this.db.getCollaborator(collaborationId, userId);
      if (!collaborator || !collaborator.permissions.includes('comment')) {
        throw new Error('Insufficient permissions to add comments');
      }

      const comment = await this.db.createComment({
        collaboration_id: collaborationId,
        user_id: userId,
        target_type: commentData.targetType, // 'document', 'citation', 'section'
        target_id: commentData.targetId,
        content: commentData.content,
        parent_comment_id: commentData.parentId || null,
        status: 'active'
      });

      // Notify collaborators
      await this.notifyCollaborators(collaborationId, {
        type: 'comment-added',
        comment,
        userId,
        timestamp: new Date()
      }, userId);

      // Log activity
      await this.db.createActivityLog({
        collaboration_id: collaborationId,
        user_id: userId,
        activity_type: 'comment_added',
        description: `Added comment on ${commentData.targetType}`,
        metadata: { commentId: comment.id, targetType: commentData.targetType }
      });

      logger.info(`Comment added to collaboration ${collaborationId} by user ${userId}`);
      return comment;

    } catch (error) {
      logger.error('Error adding comment:', error);
      throw error;
    }
  }

  async updateCollaboratorPermissions(collaborationId, adminUserId, targetUserId, newRole) {
    try {
      // Validate admin permissions
      const admin = await this.db.getCollaborator(collaborationId, adminUserId);
      if (!admin || !admin.permissions.includes('admin')) {
        throw new Error('Insufficient permissions to modify collaborator permissions');
      }

      // Don't allow changing owner permissions
      const target = await this.db.getCollaborator(collaborationId, targetUserId);
      if (target.role === 'owner') {
        throw new Error('Cannot modify owner permissions');
      }

      // Update collaborator
      const updatedCollaborator = await this.db.updateCollaborator(collaborationId, targetUserId, {
        role: newRole,
        permissions: this.permissions[newRole]
      });

      // Notify collaborators
      await this.notifyCollaborators(collaborationId, {
        type: 'permission-changed',
        targetUserId,
        newRole,
        changedBy: adminUserId,
        timestamp: new Date()
      });

      // Log activity
      await this.db.createActivityLog({
        collaboration_id: collaborationId,
        user_id: adminUserId,
        activity_type: 'permission_changed',
        description: `Changed ${target.user.name}'s role to ${newRole}`,
        metadata: { targetUserId, oldRole: target.role, newRole }
      });

      logger.info(`Permissions updated for user ${targetUserId} in collaboration ${collaborationId}`);
      return updatedCollaborator;

    } catch (error) {
      logger.error('Error updating collaborator permissions:', error);
      throw error;
    }
  }

  async getCollaborationActivity(collaborationId, userId, options = {}) {
    try {
      // Validate access
      const collaborator = await this.db.getCollaborator(collaborationId, userId);
      if (!collaborator) {
        throw new Error('Access denied to collaboration');
      }

      const { limit = 50, offset = 0, activityType, dateFrom, dateTo } = options;
      
      const activities = await this.db.getCollaborationActivity(collaborationId, {
        limit,
        offset,
        activityType,
        dateFrom,
        dateTo
      });

      return activities;

    } catch (error) {
      logger.error('Error getting collaboration activity:', error);
      throw error;
    }
  }

  async getVersionHistory(collaborationId, userId, documentType) {
    try {
      // Validate access
      const collaborator = await this.db.getCollaborator(collaborationId, userId);
      if (!collaborator) {
        throw new Error('Access denied to collaboration');
      }

      const document = await this.db.getSharedDocument(collaborationId, documentType);
      const versions = await this.db.getDocumentVersions(document.id);

      return versions;

    } catch (error) {
      logger.error('Error getting version history:', error);
      throw error;
    }
  }

  async exportCollaborativeProject(collaborationId, userId, format = 'markdown') {
    try {
      // Validate access
      const collaborator = await this.db.getCollaborator(collaborationId, userId);
      if (!collaborator) {
        throw new Error('Access denied to collaboration');
      }

      // Get all collaboration data
      const collaboration = await this.db.getCollaborationById(collaborationId);
      const documents = await this.db.getSharedDocuments(collaborationId);
      const bibliography = await this.db.getSharedBibliography(collaborationId);
      const comments = await this.db.getCollaborationComments(collaborationId);
      const collaborators = await this.db.getCollaborators(collaborationId);

      // Generate export based on format
      let exportData;
      switch (format) {
        case 'markdown':
          exportData = await this.generateMarkdownExport(collaboration, documents, bibliography, comments, collaborators);
          break;
        case 'pdf':
          exportData = await this.generatePDFExport(collaboration, documents, bibliography, comments, collaborators);
          break;
        case 'json':
          exportData = await this.generateJSONExport(collaboration, documents, bibliography, comments, collaborators);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Log activity
      await this.db.createActivityLog({
        collaboration_id: collaborationId,
        user_id: userId,
        activity_type: 'project_exported',
        description: `Exported project as ${format}`,
        metadata: { format }
      });

      logger.info(`Collaboration ${collaborationId} exported as ${format} by user ${userId}`);
      return exportData;

    } catch (error) {
      logger.error('Error exporting collaborative project:', error);
      throw error;
    }
  }

  async notifyCollaborators(collaborationId, event, excludeUserId = null) {
    try {
      const collaborators = await this.db.getCollaborators(collaborationId);
      
      collaborators.forEach(collaborator => {
        if (collaborator.user_id !== excludeUserId && collaborator.status === 'active') {
          this.io.to(`user-${collaborator.user_id}`).emit('collaboration-event', {
            collaborationId,
            event
          });
        }
      });

    } catch (error) {
      logger.error('Error notifying collaborators:', error);
    }
  }

  mergeDocumentUpdates(currentContent, updates) {
    // Simple merge strategy - in production, you'd want operational transforms
    return {
      ...currentContent,
      ...updates,
      lastModified: new Date().toISOString()
    };
  }

  generateChangeSummary(updates) {
    const changes = Object.keys(updates);
    if (changes.length === 1) {
      return `Updated ${changes[0]}`;
    } else if (changes.length <= 3) {
      return `Updated ${changes.join(', ')}`;
    } else {
      return `Updated ${changes.length} sections`;
    }
  }

  async generateMarkdownExport(collaboration, documents, bibliography, comments, collaborators) {
    let markdown = `# ${collaboration.title || 'Collaborative Research Project'}\n\n`;
    
    // Add collaborators section
    markdown += `## Collaborators\n\n`;
    collaborators.forEach(collab => {
      markdown += `- **${collab.user.name}** (${collab.role})\n`;
    });
    markdown += '\n';

    // Add documents
    documents.forEach(doc => {
      markdown += `## ${doc.document_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n`;
      markdown += `${JSON.stringify(doc.content, null, 2)}\n\n`;
    });

    // Add bibliography
    if (bibliography && bibliography.citations.length > 0) {
      markdown += `## Bibliography\n\n`;
      bibliography.citations.forEach((citation, index) => {
        markdown += `${index + 1}. ${citation.formatted_citation}\n`;
      });
      markdown += '\n';
    }

    // Add comments summary
    if (comments.length > 0) {
      markdown += `## Comments Summary\n\n`;
      markdown += `Total comments: ${comments.length}\n\n`;
    }

    return {
      content: markdown,
      filename: `collaborative_project_${collaboration.id}.md`,
      mimeType: 'text/markdown'
    };
  }

  async generateJSONExport(collaboration, documents, bibliography, comments, collaborators) {
    const exportData = {
      collaboration,
      documents,
      bibliography,
      comments,
      collaborators,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return {
      content: JSON.stringify(exportData, null, 2),
      filename: `collaborative_project_${collaboration.id}.json`,
      mimeType: 'application/json'
    };
  }

  async sendInvitationEmail(invitation, email) {
    // This would integrate with the EmailService
    // For now, just log the invitation
    logger.info(`Invitation email would be sent to ${email} for collaboration ${invitation.collaboration_id}`);
  }

  async cleanup() {
    try {
      // Clear active sessions
      this.activeSessions.clear();
      
      logger.info('Collaboration service cleaned up');
    } catch (error) {
      logger.error('Error cleaning up collaboration service:', error);
    }
  }
}

module.exports = CollaborationService; 