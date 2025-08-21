import React, { useMemo, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useStore } from '../store/useStore';
import type { Task, TaskStatus } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { CheckCircle2, Circle, Edit, Trash2 } from 'lucide-react';
import { taskService } from '../services/firebaseService';
import { toast } from '../hooks/use-toast';

interface TimelineProps {
  onEditTask: (task: Task) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ onEditTask }) => {
  const { tasks, currentView, timelineZoom, deleteTask, updateTask } = useStore();

  const timelineData = useMemo(() => {
    // Filter task yang valid (hindari crash karena tanggal invalid)
    const isValidDate = (d: unknown): d is Date => d instanceof Date && !isNaN(d.getTime());
    const validTasks = tasks.filter(t => isValidDate(t.startDate) && isValidDate(t.endDate));

    if (validTasks.length === 0) return { periods: [], tasks: [], startDate: null, endDate: null };

    // Find the date range
    const allDates = validTasks.flatMap(task => [task.startDate, task.endDate]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    let periods: Date[] = [];
    let periodFormat = '';
    let actualStartDate: Date = minDate;
    let actualEndDate: Date = maxDate;

    switch (currentView) {
      case 'daily': {
        actualStartDate = minDate;
        actualEndDate = maxDate;
        periods = eachDayOfInterval({ start: actualStartDate, end: actualEndDate });
        periodFormat = 'MMM dd';
        break;
      }
      case 'weekly': {
        actualStartDate = startOfWeek(minDate);
        actualEndDate = endOfWeek(maxDate);
        periods = eachWeekOfInterval({ start: actualStartDate, end: actualEndDate });
        periodFormat = 'MMM dd';
        break;
      }
      case 'monthly': {
        actualStartDate = startOfMonth(minDate);
        actualEndDate = endOfMonth(maxDate);
        periods = eachMonthOfInterval({ start: actualStartDate, end: actualEndDate });
        periodFormat = 'MMM yyyy';
        break;
      }
    }

    return { periods, tasks: validTasks, periodFormat, startDate: actualStartDate, endDate: actualEndDate };
  }, [tasks, currentView]);

  // Sync scroll between header and timeline body
  useEffect(() => {
    const syncScroll = () => {
      const timelineScrollElements = document.querySelectorAll('.timeline-scroll-sync');
      const headerScrollElement = document.getElementById('timeline-header-scroll');
      
      if (!headerScrollElement || timelineScrollElements.length === 0) return;

      const handleScroll = (e: Event) => {
        const scrollLeft = (e.target as HTMLElement).scrollLeft;
        
        // Sync header scroll
        if (e.target !== headerScrollElement) {
          headerScrollElement.scrollLeft = scrollLeft;
        }
        
        // Sync all timeline body scrolls
        timelineScrollElements.forEach(element => {
          if (element !== e.target) {
            (element as HTMLElement).scrollLeft = scrollLeft;
          }
        });
      };

      // Add scroll listeners
      headerScrollElement.addEventListener('scroll', handleScroll);
      timelineScrollElements.forEach(element => {
        element.addEventListener('scroll', handleScroll);
      });

      // Cleanup
      return () => {
        headerScrollElement.removeEventListener('scroll', handleScroll);
        timelineScrollElements.forEach(element => {
          element.removeEventListener('scroll', handleScroll);
        });
      };
    };

    const cleanup = syncScroll();
    return cleanup;
  }, [timelineData.periods.length, timelineZoom]);

  const getTaskPosition = (task: Task, periods: Date[]) => {
    if (periods.length === 0 || !timelineData.startDate || !timelineData.endDate) {
      return { left: 0, width: 0 };
    }

    if (currentView === 'weekly') {
      // For weekly view, calculate based on weeks
      const totalWeeks = periods.length;
      const taskStartWeek = periods.findIndex(period => {
        const weekEnd = endOfWeek(period);
        return task.startDate >= period && task.startDate <= weekEnd;
      });
      const taskEndWeek = periods.findIndex(period => {
        const weekEnd = endOfWeek(period);
        return task.endDate >= period && task.endDate <= weekEnd;
      });
      
      const startWeek = Math.max(0, taskStartWeek >= 0 ? taskStartWeek : 0);
      const endWeek = Math.min(totalWeeks - 1, Math.max(taskEndWeek >= 0 ? taskEndWeek : startWeek, startWeek));
      
      const left = (startWeek / totalWeeks) * 100;
      const width = ((endWeek - startWeek + 1) / totalWeeks) * 100;
      
      return { left, width };
    } else if (currentView === 'monthly') {
      // For monthly view, calculate based on months
      const totalMonths = periods.length;
      const taskStartMonth = periods.findIndex(period => {
        const monthEnd = endOfMonth(period);
        return task.startDate >= period && task.startDate <= monthEnd;
      });
      const taskEndMonth = periods.findIndex(period => {
        const monthEnd = endOfMonth(period);
        return task.endDate >= period && task.endDate <= monthEnd;
      });
      
      const startMonth = Math.max(0, taskStartMonth >= 0 ? taskStartMonth : 0);
      const endMonth = Math.min(totalMonths - 1, Math.max(taskEndMonth >= 0 ? taskEndMonth : startMonth, startMonth));
      
      const left = (startMonth / totalMonths) * 100;
      const width = ((endMonth - startMonth + 1) / totalMonths) * 100;
      
      return { left, width };
    } else {
      // Daily view - use consistent start/end dates from timelineData
      const totalDays = differenceInDays(timelineData.endDate, timelineData.startDate) + 1;
      const taskStartDays = Math.max(0, differenceInDays(task.startDate, timelineData.startDate));
      const taskEndDays = Math.min(totalDays - 1, differenceInDays(task.endDate, timelineData.startDate));
      const taskDuration = Math.max(1, taskEndDays - taskStartDays + 1);

      const left = (taskStartDays / totalDays) * 100;
      const width = (taskDuration / totalDays) * 100;

      return { left: Math.max(0, left), width: Math.max(1, width) };
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const newCompleted = !task.completed;
      const newStatus: TaskStatus = newCompleted ? 'done' : 'todo';
      const updatedTask = { ...task, completed: newCompleted, status: newStatus };
      
      await taskService.toggleTaskCompletion(task.id, newCompleted);
      updateTask(updatedTask);
      
      toast({
        title: task.completed ? "Task marked as incomplete" : "Task completed",
        description: `"${task.title}" has been updated.`
      });
    } catch (error) {
      console.error('Error toggling task completion:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive"
      });
    }
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

  if (timelineData.periods.length === 0) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="text-sm">Add your first task to see the timeline</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate dynamic column width based on zoom
  const getColumnWidth = () => {
    const baseWidth = currentView === 'daily' ? 100 : currentView === 'weekly' ? 120 : 150;
    return Math.round(baseWidth * (timelineZoom / 100));
  };

  const columnWidth = getColumnWidth();

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="timeline-container" data-timeline>
          {/* Timeline Layout with Sticky First Column */}
          <div className="relative">
            {/* Header Row */}
            <div className="flex border-b">
              {/* Sticky Task Header */}
              <div className="sticky left-0 z-10 w-[300px] bg-background border-r text-sm font-medium text-muted-foreground pb-2 px-4">
                Tasks
              </div>
              {/* Scrollable Date Header */}
              <div className="flex-1 pb-2 overflow-x-auto hide-scrollbar" id="timeline-header-scroll">
                <div className="flex" style={{ width: `${timelineData.periods.length * columnWidth}px` }}>
                  {timelineData.periods.map((period, index) => {
                    const displayFormat = timelineData.periodFormat || 'MMM dd';
                    if (currentView === 'weekly') {
                      const weekEnd = endOfWeek(period);
                      return (
                        <div key={index} className="text-center text-xs text-muted-foreground" style={{ width: `${columnWidth}px`, flexShrink: 0 }}>
                          <div>{format(period, 'MMM dd')}</div>
                          <div className="text-muted-foreground">to {format(weekEnd, 'MMM dd')}</div>
                        </div>
                      );
                    } else if (currentView === 'monthly') {
                      return (
                        <div key={index} className="text-center text-sm font-medium text-muted-foreground" style={{ width: `${columnWidth}px`, flexShrink: 0 }}>
                          {format(period, 'MMM yyyy')}
                        </div>
                      );
                    }
                    return (
                      <div key={index} className="text-center text-sm font-medium text-muted-foreground" style={{ width: `${columnWidth}px`, flexShrink: 0 }}>
                        {format(period, displayFormat)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Timeline Body with Sticky Column */}
            <div className="max-h-[600px] overflow-y-auto hide-scrollbar">
              <div className="space-y-1">
                {timelineData.tasks.map((task) => {
                  const position = getTaskPosition(task, timelineData.periods);
                  
                  return (
                    <div key={task.id} className="timeline-task relative flex">
                      {/* Sticky Task Info Column */}
                      <div className="sticky left-0 z-10 w-[300px] bg-background border-r px-4 py-2">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleComplete(task)}
                            className="p-0 h-auto export-hide"
                            data-export-hide
                          >
                            {task.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              task.completed ? 'line-through text-muted-foreground' : ''
                            } timeline-task-title`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground timeline-task-description">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-1 timeline-task-actions export-hide">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditTask(task)}
                              className="p-1 h-auto export-hide"
                              data-export-hide
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task)}
                              className="p-1 h-auto text-destructive hover:text-destructive export-hide"
                              data-export-hide
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable Timeline Bar */}
                      <div className="flex-1 py-2 overflow-x-auto hide-scrollbar timeline-scroll-sync">
                        <div className="relative h-6" style={{ width: `${timelineData.periods.length * columnWidth}px` }}>
                          <div className="absolute inset-0 bg-muted rounded">
                            <div
                              className={`absolute top-0 bottom-0 rounded transition-all ${
                                task.completed 
                                  ? 'bg-green-200 border-green-400 opacity-75' 
                                  : 'bg-blue-200 border-blue-400 hover:bg-blue-300'
                              } border-2 flex items-center justify-center`}
                              style={{
                                left: `${(position.left / 100) * (timelineData.periods.length * columnWidth)}px`,
                                width: `${Math.max((position.width / 100) * (timelineData.periods.length * columnWidth), 40)}px`
                              }}
                            >
                              <span className={`text-xs font-medium px-2 truncate ${
                                task.completed ? 'line-through' : ''
                              }`}>
                                {format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}
                              </span>
                              {task.completed && (
                                <CheckCircle2 className="h-3 w-3 text-green-600 ml-1 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};