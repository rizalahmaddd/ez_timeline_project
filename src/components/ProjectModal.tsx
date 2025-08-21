import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useStore } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';
import { projectService } from '../services/firebaseService';
import type { Project } from '../types';
import { toast } from '../hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ProjectModalProps {
  project?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project }) => {
  const { user } = useAuth();
  const {
    isProjectModalOpen,
    setProjectModalOpen,
    addProject,
    updateProject
  } = useStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!project;

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setNotes(project.notes || '');
    } else {
      setName('');
      setDescription('');
      setNotes('');
    }
  }, [project, isProjectModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create projects.",
        variant: "destructive"
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a project name.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing && project) {
        // Update existing project
        const updatedProject: Project = {
          ...project,
          name: name.trim(),
          description: description.trim(),
          notes: notes.trim(),
          updatedAt: new Date()
        };
        
        await projectService.updateProject(project.id, {
          name: name.trim(),
          description: description.trim(),
          notes: notes.trim()
        });
        
        updateProject(updatedProject);
        
        toast({
          title: "Project updated",
          description: `"${name}" has been updated successfully.`
        });
      } else {
        // Create new project
        const newProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
          name: name.trim(),
          description: description.trim(),
          notes: notes.trim(),
          userId: user.uid
        };
        
        const projectId = await projectService.createProject(newProject);
        
        const createdProject: Project = {
          ...newProject,
          id: projectId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        addProject(createdProject);
        
        toast({
          title: "Project created",
          description: `"${name}" has been created successfully.`
        });
      }
      
      setProjectModalOpen(false);
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} project. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setProjectModalOpen(false);
  };

  return (
    <Dialog open={isProjectModalOpen} onOpenChange={setProjectModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your project details below.'
              : 'Create a new project to organize your tasks and timeline.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Enter project name"
                disabled={isLoading}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Enter project description (optional)"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                placeholder="Add notes for this project (optional)"
                disabled={isLoading}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};