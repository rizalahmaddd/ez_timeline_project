import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useStore } from '../store/useStore';
import { projectService } from '../services/firebaseService';
import type { Project } from '../types';
import { toast } from '../hooks/use-toast';
import { MoreHorizontal, Edit, Trash2, Plus, FolderOpen, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { ShareManagement } from './ShareManagement';

interface ProjectListProps {
  onEditProject: (project: Project) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ onEditProject }) => {
  const {
    projects,
    selectedProject,
    setSelectedProject,
    deleteProject,
    setProjectModalOpen
  } = useStore();
  
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    toast({
      title: "Project selected",
      description: `Switched to "${project.name}".`
    });
  };

  const handleDeleteProject = async (project: Project) => {
    const confirmMessage = `Are you sure you want to delete "${project.name}"? This will also delete all tasks in this project. This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingProjectId(project.id);

    try {
      await projectService.deleteProject(project.id);
      deleteProject(project.id);
      
      toast({
        title: "Project deleted",
        description: `"${project.name}" and all its tasks have been deleted.`
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleCreateProject = () => {
    setProjectModalOpen(true);
  };

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first project to start organizing your tasks and timeline.
          </p>
          <Button onClick={handleCreateProject}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Button onClick={handleCreateProject} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>
      
      <div className="grid gap-4">
        {projects.map((project) => (
          <Card 
            key={project.id} 
            className={`cursor-pointer transition-colors ${
              selectedProject?.id === project.id 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}
            onClick={() => handleSelectProject(project)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">
                    {project.name}
                  </CardTitle>
                  {project.description && (
                    <CardDescription className="mt-1 line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-2">
                  {project.isShared && (
                    <div className="flex items-center space-x-1">
                      <Share2 className="h-3 w-3 text-muted-foreground" />
                      <span className={`text-xs ${
                        project.shareEnabled ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {project.shareEnabled ? 'Shared' : 'Private'}
                      </span>
                    </div>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onEditProject(project);
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project);
                        }}
                        className="text-destructive"
                        disabled={deletingProjectId === project.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Updated {format(project.updatedAt, 'MMM dd, yyyy')}
                </span>
                
                <div className="flex items-center space-x-2">
                  <ShareManagement project={project} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};