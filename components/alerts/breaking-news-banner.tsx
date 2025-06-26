'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, X, ExternalLink, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BreakingNewsAlert {
  id: number;
  title: string;
  content: string;
  source: string;
  sourceUrl: string;
  timestamp: string;
  importanceScore: number;
  streamTitle: string;
  isRead: boolean;
}

interface BreakingNewsBannerProps {
  alerts: BreakingNewsAlert[];
  onDismiss: (alertId: number) => void;
  onMarkAsRead: (alertId: number) => void;
  onViewAll: () => void;
  maxVisible?: number;
}

export function BreakingNewsBanner({
  alerts = [],
  onDismiss,
  onMarkAsRead,
  onViewAll,
  maxVisible = 3
}: BreakingNewsBannerProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<BreakingNewsAlert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Filter to unread alerts and sort by importance
    const unreadAlerts = alerts
      .filter(alert => !alert.isRead)
      .sort((a, b) => b.importanceScore - a.importanceScore);
    
    setVisibleAlerts(unreadAlerts.slice(0, isExpanded ? alerts.length : maxVisible));
  }, [alerts, isExpanded, maxVisible]);

  const handleDismiss = (alertId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    onDismiss(alertId);
    onMarkAsRead(alertId);
  };

  const handleAlertClick = (alert: BreakingNewsAlert) => {
    if (!alert.isRead) {
      onMarkAsRead(alert.id);
    }
    // Open source URL
    window.open(alert.sourceUrl, '_blank', 'noopener,noreferrer');
  };

  const getImportanceColor = (score: number) => {
    if (score >= 9) return 'bg-red-600 text-white';
    if (score >= 7) return 'bg-orange-500 text-white';
    if (score >= 5) return 'bg-yellow-500 text-black';
    return 'bg-blue-500 text-white';
  };

  const getImportanceLabel = (score: number) => {
    if (score >= 9) return 'CRITICAL';
    if (score >= 7) return 'HIGH';
    if (score >= 5) return 'MEDIUM';
    return 'LOW';
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-red-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            <span className="text-white font-semibold text-sm">
              BREAKING NEWS ALERTS
            </span>
            <Badge variant="secondary" className="bg-white text-red-600">
              {alerts.filter(a => !a.isRead).length} new
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {alerts.length > maxVisible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white hover:bg-red-800"
              >
                {isExpanded ? 'Show Less' : `Show All (${alerts.length})`}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              className="text-white hover:bg-red-800"
            >
              View All Alerts
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {visibleAlerts.map((alert) => (
            <Card
              key={alert.id}
              className="bg-white/95 backdrop-blur-sm border-red-200 cursor-pointer hover:bg-white transition-colors"
              onClick={() => handleAlertClick(alert)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getImportanceColor(alert.importanceScore)}>
                        {getImportanceLabel(alert.importanceScore)}
                      </Badge>
                      
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                      </span>
                      
                      <Badge variant="outline" className="text-xs">
                        {alert.streamTitle}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                      {alert.title}
                    </h3>
                    
                    <p className="text-gray-600 text-xs line-clamp-2 mb-2">
                      {alert.content}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        Source: {alert.source}
                      </span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDismiss(alert.id, e)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {visibleAlerts.length > 0 && (
          <div className="mt-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                visibleAlerts.forEach(alert => {
                  if (!alert.isRead) {
                    onMarkAsRead(alert.id);
                  }
                });
              }}
              className="text-white hover:bg-red-800 text-xs"
            >
              Mark All as Read
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 