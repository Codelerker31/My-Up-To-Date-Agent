const OpenAI = require('openai');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.systemPrompts = {
      conversationAgent: `You are an intelligent Updates Agent assistant designed to help users stay informed on any topic through automated research and scheduled newsletters.

Your capabilities:
- Engage in natural conversation to understand user research needs
- Ask clarifying questions about topics and preferred update schedules
- Analyze user messages to determine intent (new search, schedule change, follow-up questions)
- Provide helpful responses about the automated research process
- Suggest optimal update frequencies based on topic complexity and user needs

Your personality:
- Professional but conversational
- Proactive in asking clarifying questions
- Helpful in explaining the automated research process
- Focused on understanding user needs precisely

Key behaviors:
- When a user expresses interest in a topic, ask clarifying questions to understand their specific focus
- Always ask about preferred update frequency (daily, weekly, bi-weekly, monthly)
- Explain how the automated research works
- Confirm schedules clearly to avoid ambiguity
- Help users modify existing schedules when requested

Response format: Always respond in a conversational, helpful tone. Keep responses concise but informative.`,

      intentClassifier: `Classify the user's message intent from these categories:
- NEW_TOPIC: User wants to research a new topic
- SCHEDULE_CHANGE: User wants to modify update frequency/schedule
- SCHEDULE_CONFIRMATION: User is confirming a suggested schedule
- FOLLOW_UP_QUESTION: User is asking about recent newsletter content
- PAUSE_RESUME: User wants to pause or resume updates
- GENERAL_INQUIRY: General questions about the service
- UNCLEAR: Intent is unclear, need clarification

Respond with just the intent category and confidence (0-1).`,

      contentAnalyzer: `You are a content analysis expert. Analyze the provided content and extract:
1. Key insights and developments
2. Main themes and trends
3. Important dates and milestones
4. Source credibility assessment
5. Relevance to the specified topic

Focus on factual, recent developments and filter out promotional or low-quality content.`,

      newsletterGenerator: `You are an expert newsletter writer specializing in research summaries. Create comprehensive, well-structured newsletters that:

1. Start with an executive summary
2. Organize content by themes/categories
3. Include specific details, dates, and metrics
4. Cite sources appropriately
5. Highlight key insights and implications
6. Use clear, professional language
7. Include methodology notes for transparency

Format in clean Markdown with proper headings and structure.`
    };
  }

  async analyzeUserIntent(message, conversationHistory = []) {
    try {
      const messages = [
        { role: 'system', content: this.systemPrompts.intentClassifier },
        ...conversationHistory.slice(-5).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 100,
        temperature: 0.1
      });

      const result = response.choices[0].message.content.trim();
      const lines = result.split('\n');
      const intent = lines[0].split(':')[0] || 'UNCLEAR';
      const confidence = parseFloat(lines[1]?.split(':')[1]) || 0.5;

      return { intent, confidence };
    } catch (error) {
      logger.error('Error analyzing user intent:', error);
      return { intent: 'UNCLEAR', confidence: 0.0 };
    }
  }

  async generateConversationalResponse(message, context = {}) {
    try {
      const { streamInfo, conversationHistory, intent } = context;
      
      let systemPrompt = this.systemPrompts.conversationAgent;
      
      // Add context-specific instructions
      if (intent === 'NEW_TOPIC') {
        systemPrompt += '\n\nThe user is expressing interest in a new research topic. Ask clarifying questions to understand their specific focus and preferred update schedule.';
      } else if (intent === 'SCHEDULE_CHANGE') {
        systemPrompt += '\n\nThe user wants to modify their update schedule. Help them choose a new frequency and confirm the changes.';
      } else if (intent === 'FOLLOW_UP_QUESTION') {
        systemPrompt += '\n\nThe user is asking about recent newsletter content. Provide helpful information based on the available context.';
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 500,
        temperature: 0.7
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      logger.error('Error generating conversational response:', error);
      return 'I apologize, but I\'m having trouble processing your request right now. Please try again.';
    }
  }

  async generateScheduleConfirmation(topic, schedule) {
    const { frequency, dayOfWeek, time } = schedule;
    
    let scheduleText = `${frequency}`;
    if (dayOfWeek) {
      scheduleText += ` on ${dayOfWeek}s`;
    }
    if (time) {
      scheduleText += ` at ${time}`;
    }

    const nextUpdate = this.calculateNextUpdate(schedule);
    
    return {
      content: `Perfect! I've set up automated ${frequency} research for "${topic}". I'll deliver your first newsletter shortly, then continue researching and updating you ${scheduleText}. You can modify this schedule anytime by saying "change schedule".`,
      schedule: {
        ...schedule,
        nextUpdate
      }
    };
  }

  async analyzeContent(content, topic, sources = []) {
    try {
      const prompt = `Topic: ${topic}
      
Content to analyze:
${content}

Sources: ${sources.join(', ')}

Please analyze this content and provide:
1. Key insights relevant to the topic
2. Credibility assessment
3. Relevance score (0-1)
4. Main themes
5. Important details and dates`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: this.systemPrompts.contentAnalyzer },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      return this.parseContentAnalysis(response.choices[0].message.content);
    } catch (error) {
      logger.error('Error analyzing content:', error);
      return null;
    }
  }

  async generateNewsletter(topic, analyzedContent, reportNumber = 1, isAutomated = false) {
    try {
      const automationNote = isAutomated ? 
        `This is automated report #${reportNumber} for your ${topic} research stream.` : 
        'This is a manual research report.';

      const prompt = `Generate a comprehensive newsletter for: ${topic}

Report Details:
- Report Number: ${reportNumber}
- Type: ${isAutomated ? 'Automated' : 'Manual'} Research Report
- Content: ${JSON.stringify(analyzedContent, null, 2)}

Requirements:
1. Professional newsletter format in Markdown
2. Executive summary at the top
3. Clear sections for different themes/categories
4. Include specific details, dates, and metrics
5. Source citations
6. Key insights section
7. Methodology notes
8. Schedule information if automated

${automationNote}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: this.systemPrompts.newsletterGenerator },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.4
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      logger.error('Error generating newsletter:', error);
      return null;
    }
  }

  async extractTopicDetails(userMessage) {
    try {
      const prompt = `Extract the research topic details from this user message: "${userMessage}"

Please identify:
1. Main topic/subject
2. Specific focus areas or subtopics
3. Suggested category (Technology, Science, Business, Health, etc.)
4. Suggested update frequency based on topic complexity
5. Any specific requirements or constraints mentioned

Respond in JSON format.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.2
      });

      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        // Fallback to simple extraction
        return {
          topic: userMessage.substring(0, 100),
          category: 'General',
          suggestedFrequency: 'weekly'
        };
      }
    } catch (error) {
      logger.error('Error extracting topic details:', error);
      return null;
    }
  }

  async generateFollowUpQuestions(topic, specificFocus = null) {
    try {
      const prompt = `Generate 2-3 clarifying questions to better understand the user's research needs for the topic: "${topic}"
      
${specificFocus ? `Specific focus mentioned: ${specificFocus}` : ''}

Questions should help determine:
- Specific aspects they're most interested in
- Their background/expertise level
- Preferred depth of coverage
- Any particular use case for the information

Keep questions conversational and helpful.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.6
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      logger.error('Error generating follow-up questions:', error);
      return 'What specific aspects of this topic are you most interested in learning about?';
    }
  }

  parseContentAnalysis(analysisText) {
    // Parse the AI analysis response into structured data
    const analysis = {
      keyInsights: [],
      themes: [],
      credibilityScore: 0.8,
      relevanceScore: 0.8,
      details: []
    };

    // Simple parsing logic - in production, you might want more sophisticated parsing
    const lines = analysisText.split('\n');
    let currentSection = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('Key insights:') || trimmedLine.startsWith('1.')) {
        currentSection = 'insights';
      } else if (trimmedLine.startsWith('Main themes:') || trimmedLine.startsWith('2.')) {
        currentSection = 'themes';
      } else if (trimmedLine.startsWith('Relevance score:')) {
        const score = parseFloat(trimmedLine.match(/[\d.]+/)?.[0]);
        if (score) analysis.relevanceScore = score;
      } else if (currentSection === 'insights' && trimmedLine.startsWith('-')) {
        analysis.keyInsights.push(trimmedLine.substring(1).trim());
      } else if (currentSection === 'themes' && trimmedLine.startsWith('-')) {
        analysis.themes.push(trimmedLine.substring(1).trim());
      }
    }

    return analysis;
  }

  calculateNextUpdate(schedule) {
    const now = new Date();
    const { frequency, dayOfWeek, time } = schedule;
    
    let nextUpdate = new Date(now);
    
    // Parse time
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      nextUpdate.setHours(hours, minutes, 0, 0);
    }

    switch (frequency) {
      case 'daily':
        nextUpdate.setDate(nextUpdate.getDate() + 1);
        break;
      case 'weekly':
        // Calculate next occurrence of the specified day
        const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          .indexOf(dayOfWeek?.toLowerCase()) || 1;
        const currentDay = nextUpdate.getDay();
        let daysUntilTarget = targetDay - currentDay;
        if (daysUntilTarget <= 0) daysUntilTarget += 7;
        nextUpdate.setDate(nextUpdate.getDate() + daysUntilTarget);
        break;
      case 'bi-weekly':
        nextUpdate.setDate(nextUpdate.getDate() + 14);
        break;
      case 'monthly':
        nextUpdate.setMonth(nextUpdate.getMonth() + 1);
        break;
      default:
        nextUpdate.setDate(nextUpdate.getDate() + 7);
    }

    return nextUpdate;
  }

  suggestScheduleOptions(topic, userContext = {}) {
    // Simple logic to suggest appropriate update frequencies based on topic
    const lowerTopic = topic.toLowerCase();
    
    if (lowerTopic.includes('news') || lowerTopic.includes('stock') || lowerTopic.includes('market')) {
      return ['daily', 'weekly'];
    } else if (lowerTopic.includes('research') || lowerTopic.includes('technology') || lowerTopic.includes('ai')) {
      return ['weekly', 'bi-weekly'];
    } else if (lowerTopic.includes('industry') || lowerTopic.includes('trends')) {
      return ['weekly', 'monthly'];
    } else {
      return ['weekly', 'bi-weekly', 'monthly'];
    }
  }
}

module.exports = AIService; 