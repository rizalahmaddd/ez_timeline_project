import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Loader2 } from 'lucide-react';
import { aiService } from '../services/aiService';
import type { Task } from '../types';

interface ProjectSummaryProps {
  projectName: string;
  tasks: Task[];
}

export const ProjectSummary: React.FC<ProjectSummaryProps> = ({ projectName, tasks }) => {
  const [projectSummary, setProjectSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    if (!projectName || tasks.length === 0) {
      setProjectSummary('');
      return;
    }

    if (!aiService.validateAPIKey()) {
      setProjectSummary(`Project: ${projectName}\n\nThis project contains ${tasks.length} tasks, with ${tasks.filter(t => t.completed).length} completed and ${tasks.filter(t => !t.completed).length} remaining.`);
      return;
    }

    const generateSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const taskData = tasks.map(task => ({
          title: task.title,
          description: task.description,
          completed: task.completed || task.status === 'done'
        }));
        
        const summary = await aiService.generateProjectSummary(projectName, taskData);
        setProjectSummary(summary);
      } catch (error) {
        console.error('Error generating project summary:', error);
        setProjectSummary(`Project: ${projectName}\n\nThis project contains ${tasks.length} tasks, with ${tasks.filter(t => t.completed).length} completed and ${tasks.filter(t => !t.completed).length} remaining.`);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    // Debounce the summary generation
    const timeoutId = setTimeout(generateSummary, 1000);
    return () => clearTimeout(timeoutId);
  }, [projectName, tasks]);

  if (!projectSummary && !isLoadingSummary) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="dense-padding">
        <CardTitle className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-blue-500" />
          <span>Project Summary</span>
          {isLoadingSummary && (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="dense-padding">
        {isLoadingSummary ? (
          <div className="text-muted-foreground">
            Generating AI summary...
          </div>
        ) : (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {projectSummary}
          </div>
        )}
      </CardContent>
    </Card>
  );
};