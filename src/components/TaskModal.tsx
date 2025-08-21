import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
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
import { taskService } from '../services/firebaseService';
import type { Task, TaskStatus } from '../types';
import { toast } from '../hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface TaskModalProps {
  task?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task }) => {
  const { user } = useAuth();
  const {
    isTaskModalOpen,
    setTaskModalOpen,
    selectedProject,
    addTask,
    updateTask
  } = useStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setNotes(task.notes || '');
      setStatus(task.status || 'todo');
      setStartDate(format(task.startDate, 'yyyy-MM-dd'));
      setEndDate(format(task.endDate, 'yyyy-MM-dd'));
    } else {
      setTitle('');
      setDescription('');
      setNotes('');
      setStatus('todo');
      // Set default dates (today and tomorrow)
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(tomorrow, 'yyyy-MM-dd'));
    }
  }, [task, isTaskModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create tasks.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedProject) {
      toast({
        title: "No project selected",
        description: "Please select a project first.",
        variant: "destructive"
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Task title required",
        description: "Please enter a task title.",
        variant: "destructive"
      });
      return;
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (endDateTime < startDateTime) {
      toast({
        title: "Invalid dates",
        description: "End date must be after start date.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing && task) {
        // Update existing task
        const updatedTask: Task = {
          ...task,
          title: title.trim(),
          description: description.trim(),
          notes: notes.trim(),
          status,
          startDate: startDateTime,
          endDate: endDateTime,
          updatedAt: new Date()
        };
        
        await taskService.updateTask(task.id, {
          title: title.trim(),
          description: description.trim(),
          notes: notes.trim(),
          status,
          startDate: startDateTime,
          endDate: endDateTime
        });
        
        updateTask(updatedTask);
        
        toast({
          title: "Task updated",
          description: `"${title}" has been updated successfully.`
        });
      } else {
        // Create new task
        const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
          projectId: selectedProject.id,
          title: title.trim(),
          description: description.trim(),
          notes: notes.trim(),
          status,
          startDate: startDateTime,
          endDate: endDateTime,
          completed: false
        };
        
        const taskId = await taskService.createTask(newTask);
        
        const createdTask: Task = {
          ...newTask,
          id: taskId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        addTask(createdTask);
        
        toast({
          title: "Task created",
          description: `"${title}" has been created successfully.`
        });
      }
      
      setTaskModalOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} task. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTaskModalOpen(false);
  };

  return (
    <Dialog open={isTaskModalOpen} onOpenChange={setTaskModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your task details below.'
              : `Add a new task to "${selectedProject?.name || 'your project'}".
            `}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="Enter task title"
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
                placeholder="Enter task description (optional)"
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
                placeholder="Add notes for this task (optional)"
                disabled={isLoading}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select value={status} onValueChange={(value: TaskStatus) => setStatus(value)} disabled={isLoading}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
                required
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