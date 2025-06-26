'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  TrendingUp, 
  Code, 
  User, 
  BookOpen,
  FileText,
  Users,
  Clock
} from 'lucide-react';

interface ProjectTemplate {
  id: string;
  name: string;
  methodology: string;
  citationStyle: string;
  sources: string[];
  structure: string[];
  minSources: number;
  qualityThreshold: number;
  description?: string;
  estimatedDuration?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

interface ProjectTemplateSelectorProps {
  templates: ProjectTemplate[];
  selectedTemplate?: string;
  onTemplateSelect: (templateId: string) => void;
  onCreateProject?: (templateId: string) => void;
  showCreateButton?: boolean;
}

const templateIcons = {
  academic: GraduationCap,
  market: TrendingUp,
  technical: Code,
  personal: User
};

const templateDescriptions = {
  academic: 'Systematic research following academic standards with peer-reviewed sources and formal methodology.',
  market: 'Business-focused research analyzing market trends, competitive landscape, and industry insights.',
  technical: 'In-depth technical analysis with code examples, implementation details, and engineering documentation.',
  personal: 'Flexible research for personal interests and learning goals with customizable structure.'
};

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800'
};

export function ProjectTemplateSelector({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onCreateProject,
  showCreateButton = false
}: ProjectTemplateSelectorProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const getTemplateIcon = (templateId: string) => {
    const IconComponent = templateIcons[templateId as keyof typeof templateIcons] || BookOpen;
    return IconComponent;
  };

  const getTemplateDescription = (templateId: string) => {
    return templateDescriptions[templateId as keyof typeof templateDescriptions] || 
           'Custom research template with flexible methodology and structure.';
  };

  const getDifficultyLevel = (template: ProjectTemplate): 'beginner' | 'intermediate' | 'advanced' => {
    if (template.minSources >= 15 || template.qualityThreshold >= 0.8) return 'advanced';
    if (template.minSources >= 8 || template.qualityThreshold >= 0.7) return 'intermediate';
    return 'beginner';
  };

  const getEstimatedDuration = (template: ProjectTemplate): string => {
    const difficulty = getDifficultyLevel(template);
    switch (difficulty) {
      case 'advanced': return '4-8 weeks';
      case 'intermediate': return '2-4 weeks';
      default: return '1-2 weeks';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Research Template
        </h2>
        <p className="text-gray-600">
          Select a template that matches your research goals and methodology preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => {
          const IconComponent = getTemplateIcon(template.id);
          const difficulty = getDifficultyLevel(template);
          const isSelected = selectedTemplate === template.id;
          const isHovered = hoveredTemplate === template.id;

          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onTemplateSelect(template.id)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {template.methodology.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <Badge className={difficultyColors[difficulty]}>
                    {difficulty}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {getTemplateDescription(template.id)}
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {template.citationStyle.toUpperCase()} Style
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {template.minSources}+ Sources
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {getEstimatedDuration(template)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {(template.qualityThreshold * 100).toFixed(0)}% Quality
                    </span>
                  </div>
                </div>

                {(isSelected || isHovered) && (
                  <div className="space-y-3 pt-3 border-t border-gray-200">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Research Structure
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {template.structure.slice(0, 4).map((section, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {section.replace('-', ' ')}
                          </Badge>
                        ))}
                        {template.structure.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.structure.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Source Types
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {template.sources.slice(0, 3).map((source, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {source.replace('-', ' ')}
                          </Badge>
                        ))}
                        {template.sources.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.sources.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {showCreateButton && isSelected && onCreateProject && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateProject(template.id);
                        }}
                        className="w-full mt-4"
                      >
                        Create Project with This Template
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No research templates available</p>
        </div>
      )}
    </div>
  );
} 