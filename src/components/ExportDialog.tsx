import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from '../hooks/use-toast';
import { aiService } from '../services/aiService';
import { exportService } from '../services/exportService';
import { useStore } from '../store/useStore';
import type { ExportOptions } from '../types';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

interface ExportDialogProps {
  timelineRef: React.RefObject<HTMLDivElement | null>;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ timelineRef }) => {
  const { selectedProject, tasks } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'png',
    includeAISummary: false
  });

  const projectTasks = tasks.filter(task => 
    selectedProject ? task.projectId === selectedProject.id : false
  );

  const handleExport = async () => {
    if (!selectedProject) {
      toast({
        title: "Export failed",
        description: "No project selected.",
        variant: "destructive"
      });
      return;
    }

    // Find timeline element - try multiple selectors
    let timelineElement = timelineRef.current;
    if (!timelineElement) {
      // Try different selectors to find the timeline
      timelineElement = document.querySelector('[data-timeline]') as HTMLDivElement ||
                       document.querySelector('.timeline-container') as HTMLDivElement ||
                       document.querySelector('.timeline-grid') as HTMLDivElement ||
                       document.querySelector('.card .p-6') as HTMLDivElement;
    }
    
    if (!timelineElement) {
      toast({
        title: "Export failed",
        description: "Timeline not found. Please make sure the timeline is visible and contains tasks.",
        variant: "destructive"
      });
      return;
    }

    // Ensure the timeline has visible content
    const hasVisibleContent = timelineElement.offsetWidth > 0 && timelineElement.offsetHeight > 0;
    if (!hasVisibleContent) {
      toast({
        title: "Export failed",
        description: "Timeline has no visible content to export. Please add tasks to your project.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      let aiSummary: string | undefined;
      
      if (exportOptions.includeAISummary) {
        try {
          aiSummary = await aiService.generateProjectSummary(
            selectedProject.name,
            projectTasks.map(task => ({
              title: task.title,
              description: task.description,
              completed: task.completed
            }))
          );
        } catch (error) {
          console.warn('Failed to generate AI summary:', error);
          // Continue without AI summary
        }
      }

      await exportService.exportTimeline(
        timelineElement,
        selectedProject.name,
        exportOptions,
        aiSummary
      );

      toast({
        title: "Export successful",
        description: `Timeline exported as ${exportOptions.format.toUpperCase()}.`
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export timeline. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!selectedProject) {
      toast({
        title: "Export failed",
        description: "No project selected.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const projectData = {
        project: {
          ...selectedProject,
          id: selectedProject.id,
          name: selectedProject.name,
          description: selectedProject.description
        } as { [key: string]: unknown; id: string; name: string; description?: string },
        tasks: projectTasks.map(task => ({
          ...task,
          id: task.id,
          title: task.title,
          description: task.description
        } as { [key: string]: unknown; id: string; title: string; description?: string })),
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      await exportService.exportProjectData(selectedProject.name, projectData);

      toast({
        title: "Data exported",
        description: "Project data exported as JSON file."
      });
    } catch (error) {
      console.error('Data export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export project data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Timeline</DialogTitle>
          <DialogDescription>
            Export your project timeline as an image or PDF document.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Format Selection - Changed from dropdown to toggle buttons */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <div className="flex space-x-2">
              <Button
                variant={exportOptions.format === 'png' ? 'default' : 'outline'}
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'png' }))}
                className="flex-1"
              >
                <FileImage className="h-4 w-4 mr-2" />
                PNG Image
              </Button>
              <Button
                variant={exportOptions.format === 'pdf' ? 'default' : 'outline'}
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'pdf' }))}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF Document
              </Button>
            </div>
          </div>
          
          {/* AI Summary Option */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-summary">Include AI Summary</Label>
              <p className="text-sm text-muted-foreground">
                Add an AI-generated project summary to the export
              </p>
            </div>
            <Switch
              id="ai-summary"
              checked={exportOptions.includeAISummary}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeAISummary: checked }))
              }
              disabled={exportOptions.format === 'png'}
            />
          </div>
          
          {exportOptions.format === 'png' && exportOptions.includeAISummary && (
            <p className="text-sm text-muted-foreground">
              AI summary is only available for PDF exports.
            </p>
          )}
          
          {/* Project Info */}
          {selectedProject && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-medium">{selectedProject.name}</p>
              <p className="text-sm text-muted-foreground">
                {projectTasks.length} tasks
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col space-y-2">
          <div className="flex space-x-2 w-full">
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={isLoading || !selectedProject}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Export Data
            </Button>
            <Button
              onClick={handleExport}
              disabled={isLoading || !selectedProject}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Export Timeline
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};