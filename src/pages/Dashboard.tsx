import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { projectService, taskService } from '../services/firebaseService';
import { aiService } from '../services/aiService';
import type { Project, Task } from '../types';
import { toast } from '../components/ui/use-toast';

// Components
import { AuthenticationDialog } from '../components/AuthenticationDialog';
import { UserProfile } from '../components/UserProfile';
import { ProjectList } from '../components/ProjectList';
import { ProjectModal } from '../components/ProjectModal';
import { TaskModal } from '../components/TaskModal';
import { Timeline } from '../components/Timeline';
import { ViewToggle } from '../components/ViewToggle';

import { FloatingAIChat } from '../components/FloatingAIChat';
import { KanbanBoard } from '../components/KanbanBoard';
import { ExportDialog } from '../components/ExportDialog';
import { TimelineZoomSlider } from '../components/TimelineZoomSlider';

import { Plus, Bot, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const {
    selectedProject,
    tasks,
    currentView,
    isSidebarCollapsed,
    setSidebarCollapsed,
    setProjects,
    setTasks,
    setSelectedProject,
    setProjectModalOpen,
    setTaskModalOpen,
    // setAIChatOpen // Removed unused import
  } = useStore();
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [projectSummary, setProjectSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Load user projects when user changes
  useEffect(() => {
    if (!user) {
      setProjects([]);
      setTasks([]);
      return;
    }

    setIsLoadingData(true);
    
    // Subscribe to projects with error handling
    const unsubscribeProjects = projectService.subscribeToUserProjects(
      user.uid,
      (userProjects) => {
        console.log('🔍 Projects loaded:', userProjects.length, userProjects.map(p => ({ id: p.id, name: p.name })));
        setProjects(userProjects);
        
        // Restore selected project from localStorage if available
        const savedProjectId = localStorage.getItem('selectedProjectId');
        console.log('🔍 Saved project ID from localStorage:', savedProjectId);
        
        if (savedProjectId && userProjects.length > 0) {
          const savedProject = userProjects.find(p => p.id === savedProjectId);
          if (savedProject) {
            console.log('🔍 Restoring selected project from localStorage:', savedProject.name, savedProject.id);
            setSelectedProject(savedProject);
          } else {
            console.log('🔍 Saved project not found in user projects, clearing localStorage');
            // Clear invalid saved project ID
            localStorage.removeItem('selectedProjectId');
          }
        } else {
          console.log('🔍 No saved project ID or no projects available');
        }
        
        setIsLoadingData(false);
      }
    );



    return () => {
      if (unsubscribeProjects) {
        unsubscribeProjects();
      }
    };
  }, [user, setProjects, setTasks, setSelectedProject]);

  // Load tasks when selected project changes
  useEffect(() => {
    if (!selectedProject || !user) {
      console.log('🔍 No selectedProject or user:', { selectedProject: selectedProject?.id, user: user?.uid });
      setTasks([]);
      return;
    }

    console.log('🔍 Subscribing to tasks for project:', selectedProject.id, selectedProject.name);

    const currentProjectId = selectedProject.id;
    let unsubscribeTasks: (() => void) | null = null;
    let initialFetchDone = false;

    // Initial fetch to prevent empty state during reload
    (async () => {
      try {
        console.log('🔍 Starting initial fetch for project:', currentProjectId);
        const initialTasks = await taskService.getProjectTasks(currentProjectId);
        console.log('🔍 Initial fetch result:', {
          projectId: currentProjectId,
          tasksCount: initialTasks.length,
          tasks: initialTasks.map(t => ({ id: t.id, title: t.title, startDate: t.startDate, endDate: t.endDate }))
        });
        
        if (selectedProject && currentProjectId === selectedProject.id) {
          setTasks(initialTasks);
          console.log('🔍 Tasks set in store:', initialTasks.length);
        } else {
          console.log('🔍 Project changed during fetch, skipping setTasks');
        }
      } catch (error) {
        console.error('🔍 Initial task fetch error:', error);
        toast({
          title: "Task Loading Error",
          description: "Failed to load tasks initially. Waiting for real-time updates...",
          variant: "destructive"
        });
      } finally {
        initialFetchDone = true;
        console.log('🔍 Initial fetch done flag set to true');
      }
    })();

    // Subscribe to tasks with a small delay
    const timeoutId = setTimeout(() => {
      try {
        console.log('🔍 Setting up real-time subscription for project:', currentProjectId);
        unsubscribeTasks = taskService.subscribeToProjectTasks(
          currentProjectId,
          (projectTasks) => {
            console.log('🔍 Real-time tasks update:', {
              projectId: currentProjectId,
              tasksCount: projectTasks.length,
              initialFetchDone,
              selectedProjectId: selectedProject?.id
            });

            try {
              // Avoid clearing tasks due to transient empty snapshot right after reload
              const isTransientEmpty = projectTasks.length === 0 && !initialFetchDone;
              if (isTransientEmpty) {
                console.log('🔍 Skip transient empty snapshot for project:', currentProjectId);
                return;
              }

              // Guard against race: only set if still same project
              if (selectedProject && currentProjectId === selectedProject.id) {
                console.log('🔍 Setting tasks from real-time update:', projectTasks.length);
                setTasks(projectTasks);
              } else {
                console.log('🔍 Skip setting tasks due to project switch race condition');
              }
            } catch (error) {
              console.error('🔍 Error setting tasks in store:', error);
              toast({
                title: "Task Update Error",
                description: "Failed to update tasks in memory. Please refresh.",
                variant: "destructive"
              });
            }
          }
        );
      } catch (error) {
        console.error('🔍 Task subscription error:', error);
        toast({
          title: "Task Loading Error",
          description: "Failed to load tasks. Please try refreshing.",
          variant: "destructive"
        });
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribeTasks) {
        console.log('🔍 Unsubscribing from tasks for project:', currentProjectId);
        try {
          unsubscribeTasks();
        } catch (error) {
          console.error('🔍 Error unsubscribing from tasks:', error);
        }
      }
    };
  }, [selectedProject, user, setTasks]);

  // Auto-generate project summary when project or tasks change
  useEffect(() => {
    if (!selectedProject || tasks.length === 0) {
      setProjectSummary('');
      return;
    }

    if (!aiService.validateAPIKey()) {
      setProjectSummary(`Project: ${selectedProject.name}\n\nThis project contains ${tasks.length} tasks, with ${tasks.filter(t => t.completed).length} completed and ${tasks.filter(t => !t.completed).length} remaining.`);
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
        
        const summary = await aiService.generateProjectSummary(selectedProject.name, taskData);
        setProjectSummary(summary);
      } catch (error) {
        console.error('Error generating project summary:', error);
        setProjectSummary(`Project: ${selectedProject.name}\n\nThis project contains ${tasks.length} tasks, with ${tasks.filter(t => t.completed).length} completed and ${tasks.filter(t => !t.completed).length} remaining.`);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    // Debounce the summary generation
    const timeoutId = setTimeout(generateSummary, 1000);
    return () => clearTimeout(timeoutId);
  }, [selectedProject, tasks]);

  // Monitor online status for real-time sync
  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online');
      // Optionally refresh data when coming back online
    };
    
    const handleOffline = () => {
      console.log('App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleCreateTask = () => {
    if (!selectedProject) {
      toast({
        title: "No project selected",
        description: "Please select a project first.",
        variant: "destructive"
      });
      return;
    }
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setProjectModalOpen(true);
  };



  // Show authentication dialog if user is not logged in
  if (!authLoading && !user) {
    return <AuthenticationDialog open={true} onOpenChange={() => {}} />;
  }

  // Show loading state
  if (authLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {authLoading ? 'Authenticating...' : 'Loading your projects...'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto dense-container space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Timeline Project</h1>
            <p className="text-muted-foreground">
              Organize your projects and visualize your timeline
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <UserProfile />
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-3 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-3'
        }`}>
          {/* Sidebar - Projects */}
          {!isSidebarCollapsed && (
            <div className="lg:col-span-1 dense-spacing">
              <ProjectList onEditProject={handleEditProject} />
            </div>
          )}

          {/* Main Content - Timeline */}
          <div className={`dense-spacing ${
            isSidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-2'
          }`}>
            {selectedProject ? (
              <>
                {/* Timeline Header */}
                <Card>
                  <CardContent className="dense-card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {selectedProject.name}
                        </h2>
                        {selectedProject.description && (
                          <p className="text-muted-foreground">
                            {selectedProject.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
                          className="mr-2"
                        >
                          {isSidebarCollapsed ? (
                            <PanelLeftOpen className="h-4 w-4" />
                          ) : (
                            <PanelLeftClose className="h-4 w-4" />
                          )}
                        </Button>
                        <ViewToggle />
                        <ExportDialog timelineRef={timelineRef} />
                      </div>
                    </div>
                    
                    {/* Timeline Controls */}
                    {currentView !== 'kanban' && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Timeline Zoom
                        </div>
                        <TimelineZoomSlider />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {tasks.length} tasks
                      </div>
                      
                      <Button onClick={handleCreateTask} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Project Summary */}
                {(projectSummary || isLoadingSummary) && (
                  <Card>
                    <CardContent className="dense-card">
                      <div className="flex items-center mb-3">
                        <Bot className="h-5 w-5 mr-2 text-blue-500" />
                        <h3 className="text-lg font-medium">Project Summary</h3>
                        {isLoadingSummary && (
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        )}
                      </div>
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
                )}

                {/* Timeline or Kanban */}
                <div ref={timelineRef} className="timeline-container">
                  {currentView === 'kanban' ? (
                    <KanbanBoard onEditTask={handleEditTask} />
                  ) : (
                    <Timeline onEditTask={handleEditTask} />
                  )}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">
                      Select a project to view timeline
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Choose a project from the sidebar or create a new one to get started.
                    </p>
                    <Button onClick={handleCreateProject}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals and Floating Components */}
      <ProjectModal project={editingProject} />
      <TaskModal task={editingTask} />
      <FloatingAIChat />
    </div>
  );
};