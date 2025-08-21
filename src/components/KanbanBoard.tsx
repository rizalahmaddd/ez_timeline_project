import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useStore } from '../store/useStore';
import type { Task, TaskStatus, KanbanColumn } from '../types';
import { taskService } from '../services/firebaseService';
import { toast } from '../hooks/use-toast';
import { format } from 'date-fns';
import { Edit, Trash2, StickyNote, Plus, X, Settings } from 'lucide-react';

interface KanbanBoardProps {
  onEditTask: (task: Task) => void;
}

const defaultColumns: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100 border-gray-300', status: 'todo' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100 border-blue-300', status: 'in-progress' },
  { id: 'pending', title: 'Pending', color: 'bg-yellow-100 border-yellow-300', status: 'pending' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-100 border-red-300', status: 'blocked' },
  { id: 'done', title: 'Done', color: 'bg-green-100 border-green-300', status: 'done' }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ onEditTask }) => {
  const { tasks, updateTask, deleteTask, selectedProject: currentProject, addTask } = useStore();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedOver, setDraggedOver] = useState<TaskStatus | null>(null);
  const [customColumns, setCustomColumns] = useState<KanbanColumn[]>([
    { id: 'todo', title: 'To Do', status: 'todo' },
    { id: 'in-progress', title: 'In Progress', status: 'in-progress' },
    { id: 'done', title: 'Done', status: 'done' },
    { id: 'pending', title: 'Pending', status: 'pending' },
    { id: 'blocked', title: 'Blocked', status: 'blocked' }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState<{ [key: string]: string }>({});
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumn, setEditingColumn] = useState<string | null>(null);

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => (task.status || 'todo') === status);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOver(status);
  };

  const handleDragLeave = () => {
    setDraggedOver(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDraggedOver(null);
    
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    try {
      const completed = newStatus === 'done';
      const updatedTask = { ...draggedTask, status: newStatus, completed };
      await taskService.updateTask(draggedTask.id, { status: newStatus, completed });
      updateTask(updatedTask);
      
      toast({
        title: "Task moved",
        description: `"${draggedTask.title}" moved to ${defaultColumns.find(col => col.id === newStatus)?.title}`
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive"
      });
    }
    
    setDraggedTask(null);
  };

  const handleQuickAddTask = async (status: TaskStatus) => {
    const title = newTaskTitle[status]?.trim();
    if (!title || !currentProject) return;

    try {
      const newTask: Omit<Task, 'id'> = {
        projectId: currentProject.id,
        title,
        description: '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status,
        completed: status === 'done',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const taskId = await taskService.createTask(newTask);
      addTask({ ...newTask, id: taskId });
      setNewTaskTitle({ ...newTaskTitle, [status]: '' });
      
      toast({
        title: "Task created",
        description: `"${title}" has been added to ${status}`
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return;
    
    const newColumn: KanbanColumn = {
      id: `custom-${Date.now()}`,
      title: newColumnTitle,
      status: `custom-${Date.now()}` as TaskStatus
    };
    
    setCustomColumns([...customColumns, newColumn]);
    setNewColumnTitle('');
  };

  const handleDeleteColumn = (columnId: string) => {
    const defaultColumns = ['todo', 'in-progress', 'done', 'pending', 'blocked'];
    if (defaultColumns.includes(columnId)) {
      toast({
        title: "Cannot delete",
        description: "Default columns cannot be deleted.",
        variant: "destructive"
      });
      return;
    }
    
    setCustomColumns(customColumns.filter(col => col.id !== columnId));
  };

  const handleEditColumn = (columnId: string, newTitle: string) => {
    setCustomColumns(customColumns.map(col => 
      col.id === columnId ? { ...col, title: newTitle } : col
    ));
    setEditingColumn(null);
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) {
      return;
    }

    try {
      await taskService.deleteTask(task.id);
      deleteTask(task.id);
      
      toast({
        title: "Task deleted",
        description: `"${task.title}" has been deleted.`
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeColor = (status: TaskStatus) => {
    switch (status) {
      case 'todo': return 'bg-gray-500';
      case 'in-progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'blocked': return 'bg-red-500';
      case 'done': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (tasks.length === 0) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="text-sm">Add your first task to see the kanban board</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Kanban Board</h2>
        <Dialog open={showColumnSettings} onOpenChange={setShowColumnSettings}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage Columns
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Kanban Columns</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="New column title"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddColumn()}
                />
                <Button onClick={handleAddColumn} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {customColumns.map((column) => (
                  <div key={column.id} className="flex items-center gap-2 p-2 border rounded">
                    {editingColumn === column.id ? (
                      <Input
                        defaultValue={column.title}
                        onBlur={(e) => handleEditColumn(column.id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditColumn(column.id, e.currentTarget.value);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span 
                        className="flex-1 cursor-pointer"
                        onClick={() => setEditingColumn(column.id)}
                      >
                        {column.title}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteColumn(column.id)}
                      disabled={['todo', 'in-progress', 'done', 'pending', 'blocked'].includes(column.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {customColumns.map((column) => {
          const columnTasks = getTasksByStatus(column.status);
          const isDraggedOver = draggedOver === column.status;
          
          return (
            <Card 
              key={column.id} 
              className={`bg-gray-50 ${isDraggedOver ? 'ring-2 ring-blue-500' : ''} transition-all`}
              onDragOver={(e) => handleDragOver(e, column.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{column.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {columnTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              {/* Quick Add Task */}
              <div className="px-6 pb-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add task..."
                    value={newTaskTitle[column.status] || ''}
                    onChange={(e) => setNewTaskTitle({ ...newTaskTitle, [column.status]: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleQuickAddTask(column.status);
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleQuickAddTask(column.status)}
                    disabled={!newTaskTitle[column.status]?.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="space-y-3">
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-move hover:shadow-md transition-shadow bg-white border"
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium line-clamp-2">{task.title}</h4>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditTask(task)}
                              className="p-1 h-auto"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task)}
                              className="p-1 h-auto text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        
                        {task.notes && (
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <StickyNote className="h-3 w-3" />
                            <span className="line-clamp-1">{task.notes}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <Badge 
                            className={`text-xs text-white ${getStatusBadgeColor(task.status || 'todo')}`}
                          >
                            {column.title}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No tasks</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};