const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class ExportService {
  constructor() {
    this.isInitialized = false;
    
    // Export templates
    this.templates = {
      academic: {
        latex: 'academic_paper.tex',
        word: 'academic_paper.docx',
        presentation: 'academic_presentation.pptx'
      },
      business: {
        latex: 'business_report.tex',
        word: 'business_report.docx', 
        presentation: 'business_presentation.pptx'
      },
      technical: {
        latex: 'technical_report.tex',
        word: 'technical_report.docx',
        presentation: 'technical_presentation.pptx'
      }
    };

    // Citation formats for different export types
    this.citationFormats = {
      latex: {
        apa: '\\cite{{{key}}}',
        ieee: '\\cite{{{key}}}',
        chicago: '\\cite{{{key}}}',
        mla: '\\cite{{{key}}}'
      },
      word: {
        apa: '{author}, {year}',
        ieee: '[{number}]',
        chicago: '({author} {year})',
        mla: '({author} {page})'
      }
    };

    // Export quality settings
    this.qualitySettings = {
      pdf: {
        low: { dpi: 150, compression: 'high' },
        medium: { dpi: 300, compression: 'medium' },
        high: { dpi: 600, compression: 'low' }
      },
      images: {
        low: { width: 800, quality: 70 },
        medium: { width: 1200, quality: 85 },
        high: { width: 1920, quality: 95 }
      }
    };
  }

  async initialize() {
    try {
      logger.info('Export service initializing...');
      
      // Check for required dependencies
      await this.checkDependencies();
      
      // Initialize templates
      await this.loadTemplates();
      
      this.isInitialized = true;
      logger.info('Export service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize export service:', error);
      throw error;
    }
  }

  async checkDependencies() {
    const dependencies = {
      puppeteer: false,
      latex: false,
      pandoc: false
    };

    try {
      // Check if Puppeteer is available (for PDF generation)
      require('puppeteer');
      dependencies.puppeteer = true;
    } catch (error) {
      logger.warn('Puppeteer not available - PDF generation will be limited');
    }

    // In production, you would check for LaTeX and Pandoc installations
    logger.info('Export dependencies checked:', dependencies);
    return dependencies;
  }

  async loadTemplates() {
    // In production, this would load actual template files
    logger.info('Export templates loaded');
  }

  async exportToPDF(content, options = {}) {
    try {
      const {
        format = 'a4',
        quality = 'medium',
        includeTableOfContents = true,
        includeBibliography = true,
        template = 'academic',
        customCSS = null
      } = options;

      // Generate HTML content
      const htmlContent = await this.generateHTML(content, {
        template,
        includeTableOfContents,
        includeBibliography,
        customCSS
      });

      // Convert to PDF using Puppeteer
      const pdfBuffer = await this.htmlToPDF(htmlContent, {
        format,
        quality: this.qualitySettings.pdf[quality]
      });

      const filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      logger.info(`PDF export completed: ${filename}`);
      return {
        buffer: pdfBuffer,
        filename: filename,
        mimeType: 'application/pdf',
        size: pdfBuffer.length
      };

    } catch (error) {
      logger.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  async exportToLaTeX(content, options = {}) {
    try {
      const {
        template = 'academic',
        citationStyle = 'apa',
        includePackages = [],
        customPreamble = ''
      } = options;

      let latex = this.generateLaTeXPreamble(template, citationStyle, includePackages, customPreamble);
      
      // Document content
      latex += '\\begin{document}\n\n';
      
      // Title page
      latex += this.generateLaTeXTitle(content);
      
      // Table of contents
      if (content.includeTableOfContents) {
        latex += '\\tableofcontents\n\\newpage\n\n';
      }

      // Abstract
      if (content.abstract) {
        latex += this.generateLaTeXAbstract(content.abstract);
      }

      // Main content sections
      if (content.sections) {
        content.sections.forEach(section => {
          latex += this.generateLaTeXSection(section, citationStyle);
        });
      }

      // Bibliography
      if (content.bibliography && content.bibliography.length > 0) {
        latex += this.generateLaTeXBibliography(content.bibliography, citationStyle);
      }

      latex += '\\end{document}';

      const filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.tex`;

      logger.info(`LaTeX export completed: ${filename}`);
      return {
        content: latex,
        filename: filename,
        mimeType: 'application/x-tex',
        size: latex.length
      };

    } catch (error) {
      logger.error('Error exporting to LaTeX:', error);
      throw error;
    }
  }

  async exportToWord(content, options = {}) {
    try {
      const {
        template = 'academic',
        citationStyle = 'apa',
        includeComments = false
      } = options;

      // Generate Word-compatible content using a simplified approach
      // In production, you would use libraries like docx or officegen
      
      const wordContent = this.generateWordContent(content, template, citationStyle);
      
      const filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

      logger.info(`Word export completed: ${filename}`);
      return {
        content: wordContent,
        filename: filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        note: 'Word export requires additional processing in production environment'
      };

    } catch (error) {
      logger.error('Error exporting to Word:', error);
      throw error;
    }
  }

  async exportToPresentation(content, options = {}) {
    try {
      const {
        template = 'academic',
        slideLayout = 'standard',
        includeNotes = true,
        maxSlidesPerSection = 5
      } = options;

      const presentation = {
        title: content.title,
        author: content.author,
        slides: []
      };

      // Title slide
      presentation.slides.push({
        type: 'title',
        title: content.title,
        subtitle: content.subtitle || '',
        author: content.author || '',
        date: new Date().toLocaleDateString()
      });

      // Outline slide
      if (content.sections && content.sections.length > 1) {
        presentation.slides.push({
          type: 'outline',
          title: 'Outline',
          content: content.sections.map(section => section.title)
        });
      }

      // Content slides
      if (content.sections) {
        content.sections.forEach(section => {
          const sectionSlides = this.generateSectionSlides(section, maxSlidesPerSection);
          presentation.slides.push(...sectionSlides);
        });
      }

      // Conclusion slide
      if (content.conclusion) {
        presentation.slides.push({
          type: 'conclusion',
          title: 'Conclusion',
          content: content.conclusion
        });
      }

      // Bibliography slide
      if (content.bibliography && content.bibliography.length > 0) {
        presentation.slides.push({
          type: 'bibliography',
          title: 'References',
          content: content.bibliography.slice(0, 10) // Limit for readability
        });
      }

      const filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.json`;

      logger.info(`Presentation export completed: ${filename} (${presentation.slides.length} slides)`);
      return {
        content: JSON.stringify(presentation, null, 2),
        filename: filename,
        mimeType: 'application/json',
        slideCount: presentation.slides.length,
        note: 'Presentation export as JSON structure - requires PowerPoint/Google Slides integration for full functionality'
      };

    } catch (error) {
      logger.error('Error exporting to presentation:', error);
      throw error;
    }
  }

  async generateHTML(content, options = {}) {
    const {
      template = 'academic',
      includeTableOfContents = true,
      includeBibliography = true,
      customCSS = null
    } = options;

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
    <style>
        ${this.getDefaultCSS(template)}
        ${customCSS || ''}
    </style>
</head>
<body>
`;

    // Title page
    html += `
    <div class="title-page">
        <h1 class="title">${content.title}</h1>
        ${content.subtitle ? `<h2 class="subtitle">${content.subtitle}</h2>` : ''}
        ${content.author ? `<p class="author">${content.author}</p>` : ''}
        <p class="date">${new Date().toLocaleDateString()}</p>
    </div>
`;

    // Table of contents
    if (includeTableOfContents && content.sections) {
      html += '<div class="table-of-contents">';
      html += '<h2>Table of Contents</h2>';
      html += '<ul>';
      content.sections.forEach((section, index) => {
        html += `<li><a href="#section-${index}">${section.title}</a></li>`;
      });
      html += '</ul>';
      html += '</div>';
    }

    // Abstract
    if (content.abstract) {
      html += `
      <div class="abstract">
          <h2>Abstract</h2>
          <p>${content.abstract}</p>
      </div>
`;
    }

    // Main content
    if (content.sections) {
      content.sections.forEach((section, index) => {
        html += `
        <div class="section" id="section-${index}">
            <h2>${section.title}</h2>
            ${this.formatSectionContent(section.content)}
        </div>
`;
      });
    }

    // Bibliography
    if (includeBibliography && content.bibliography) {
      html += '<div class="bibliography">';
      html += '<h2>Bibliography</h2>';
      html += '<ol>';
      content.bibliography.forEach(citation => {
        html += `<li>${citation.formatted_citation}</li>`;
      });
      html += '</ol>';
      html += '</div>';
    }

    html += '</body></html>';

    return html;
  }

  async htmlToPDF(htmlContent, options = {}) {
    try {
      const puppeteer = require('puppeteer');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        }
      });
      
      await browser.close();
      
      return pdfBuffer;
      
    } catch (error) {
      logger.error('Error converting HTML to PDF:', error);
      throw new Error('PDF generation failed - Puppeteer not available');
    }
  }

  getDefaultCSS(template) {
    const baseCSS = `
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .title-page {
            text-align: center;
            margin-bottom: 50px;
            page-break-after: always;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 18px;
            margin-bottom: 20px;
        }
        .author {
            font-size: 16px;
            margin-bottom: 10px;
        }
        .date {
            font-size: 14px;
        }
        .table-of-contents {
            margin-bottom: 30px;
            page-break-after: always;
        }
        .abstract {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f9f9f9;
            border-left: 4px solid #ccc;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        .bibliography {
            margin-top: 40px;
            page-break-before: always;
        }
        .bibliography ol {
            padding-left: 20px;
        }
        .bibliography li {
            margin-bottom: 10px;
        }
    `;

    // Template-specific styles
    switch (template) {
      case 'business':
        return baseCSS + `
            body { font-family: Arial, sans-serif; }
            .title { color: #2c3e50; }
            .section h2 { color: #34495e; }
        `;
      case 'technical':
        return baseCSS + `
            body { font-family: 'Courier New', monospace; }
            .code { background-color: #f4f4f4; padding: 10px; border-radius: 4px; }
        `;
      default:
        return baseCSS;
    }
  }

  formatSectionContent(content) {
    if (typeof content === 'string') {
      return `<p>${content}</p>`;
    }
    
    if (Array.isArray(content)) {
      return content.map(item => `<p>${item}</p>`).join('');
    }
    
    if (typeof content === 'object') {
      let formatted = '';
      Object.entries(content).forEach(([key, value]) => {
        formatted += `<h3>${key}</h3><p>${value}</p>`;
      });
      return formatted;
    }
    
    return '<p>No content available</p>';
  }

  generateLaTeXPreamble(template, citationStyle, includePackages, customPreamble) {
    let preamble = `\\documentclass[12pt,a4paper]{article}

% Standard packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{setspace}

% Citation package
\\usepackage[${citationStyle}]{biblatex}

% Page geometry
\\geometry{margin=1in}
\\doublespacing

`;

    // Add custom packages
    includePackages.forEach(pkg => {
      preamble += `\\usepackage{${pkg}}\n`;
    });

    // Add custom preamble
    if (customPreamble) {
      preamble += `\n${customPreamble}\n`;
    }

    return preamble + '\n';
  }

  generateLaTeXTitle(content) {
    return `
\\title{${content.title}}
${content.author ? `\\author{${content.author}}` : ''}
\\date{\\today}

\\maketitle
\\newpage

`;
  }

  generateLaTeXAbstract(abstract) {
    return `
\\begin{abstract}
${abstract}
\\end{abstract}
\\newpage

`;
  }

  generateLaTeXSection(section, citationStyle) {
    let latex = `\\section{${section.title}}\n\n`;
    
    if (typeof section.content === 'string') {
      latex += section.content + '\n\n';
    } else if (Array.isArray(section.content)) {
      section.content.forEach(paragraph => {
        latex += paragraph + '\n\n';
      });
    }
    
    return latex;
  }

  generateLaTeXBibliography(bibliography, citationStyle) {
    let latex = '\\newpage\n\\bibliography{references}\n\\bibliographystyle{' + citationStyle + '}\n\n';
    
    // In production, you would generate a proper .bib file
    latex += '% Bibliography entries would be in a separate .bib file\n';
    
    return latex;
  }

  generateWordContent(content, template, citationStyle) {
    // Simplified Word content generation
    // In production, use libraries like docx.js or mammoth.js
    
    let wordContent = `Title: ${content.title}\n\n`;
    
    if (content.author) {
      wordContent += `Author: ${content.author}\n\n`;
    }
    
    if (content.abstract) {
      wordContent += `Abstract:\n${content.abstract}\n\n`;
    }
    
    if (content.sections) {
      content.sections.forEach(section => {
        wordContent += `${section.title}\n`;
        wordContent += '='.repeat(section.title.length) + '\n\n';
        wordContent += section.content + '\n\n';
      });
    }
    
    if (content.bibliography) {
      wordContent += 'Bibliography\n';
      wordContent += '============\n\n';
      content.bibliography.forEach((citation, index) => {
        wordContent += `${index + 1}. ${citation.formatted_citation}\n`;
      });
    }
    
    return wordContent;
  }

  generateSectionSlides(section, maxSlides) {
    const slides = [];
    
    // Section title slide
    slides.push({
      type: 'section_title',
      title: section.title,
      content: section.summary || ''
    });
    
    // Content slides
    if (section.content) {
      const contentChunks = this.chunkContentForSlides(section.content, maxSlides - 1);
      
      contentChunks.forEach((chunk, index) => {
        slides.push({
          type: 'content',
          title: `${section.title} (${index + 1})`,
          content: chunk
        });
      });
    }
    
    return slides;
  }

  chunkContentForSlides(content, maxChunks) {
    if (typeof content === 'string') {
      // Split long content into chunks
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const chunkSize = Math.ceil(sentences.length / maxChunks);
      
      const chunks = [];
      for (let i = 0; i < sentences.length; i += chunkSize) {
        chunks.push(sentences.slice(i, i + chunkSize).join('. ') + '.');
      }
      
      return chunks.slice(0, maxChunks);
    }
    
    if (Array.isArray(content)) {
      return content.slice(0, maxChunks);
    }
    
    return [content];
  }

  async batchExport(content, formats, options = {}) {
    try {
      const exports = {};
      const exportPromises = [];

      formats.forEach(format => {
        switch (format) {
          case 'pdf':
            exportPromises.push(
              this.exportToPDF(content, options.pdf).then(result => {
                exports.pdf = result;
              })
            );
            break;
          case 'latex':
            exportPromises.push(
              this.exportToLaTeX(content, options.latex).then(result => {
                exports.latex = result;
              })
            );
            break;
          case 'word':
            exportPromises.push(
              this.exportToWord(content, options.word).then(result => {
                exports.word = result;
              })
            );
            break;
          case 'presentation':
            exportPromises.push(
              this.exportToPresentation(content, options.presentation).then(result => {
                exports.presentation = result;
              })
            );
            break;
        }
      });

      await Promise.all(exportPromises);

      logger.info(`Batch export completed for formats: ${formats.join(', ')}`);
      return exports;

    } catch (error) {
      logger.error('Error in batch export:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      // Clean up temporary files if any
      logger.info('Export service cleaned up');
    } catch (error) {
      logger.error('Error cleaning up export service:', error);
    }
  }
}

module.exports = ExportService; 