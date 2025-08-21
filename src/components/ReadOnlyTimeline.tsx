import React, { useMemo, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { useStore } from '../store/useStore';
import type { Task } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';

interface ReadOnlyTimelineProps {
  tasks: Task[];
}

export const ReadOnlyTimeline: React.FC<ReadOnlyTimelineProps> = ({ tasks }) => {
  const { currentView, timelineZoom } = useStore();

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

      // Cleanup function
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

  const getTaskPosition = (task: Task, periods: Date[], columnWidth: number) => {
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
      
      const left = startWeek * columnWidth;
      const width = (endWeek - startWeek + 1) * columnWidth;
      
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
      
      const left = startMonth * columnWidth;
      const width = (endMonth - startMonth + 1) * columnWidth;
      
      return { left, width };
    } else {
      // Daily view - use pixel-based calculations for precision
      const totalDays = differenceInDays(timelineData.endDate, timelineData.startDate) + 1;
      const taskStartDays = Math.max(0, differenceInDays(task.startDate, timelineData.startDate));
      const taskEndDays = Math.min(totalDays - 1, differenceInDays(task.endDate, timelineData.startDate));
      const taskDuration = Math.max(1, taskEndDays - taskStartDays + 1);
      
      const left = taskStartDays * columnWidth;
      const width = taskDuration * columnWidth;
      
      return { left: Math.max(0, left), width: Math.max(columnWidth, width) };
    }
  };

  if (timelineData.periods.length === 0) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No tasks in this project</p>
            <p className="text-sm">This shared project doesn't contain any tasks yet</p>
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
                  const position = getTaskPosition(task, timelineData.periods, columnWidth);
                  
                  return (
                    <div key={task.id} className="timeline-task relative flex">
                      {/* Sticky Task Info Column */}
                      <div className="sticky left-0 z-10 w-[300px] bg-background border-r px-4 py-2">
                        <div className="flex items-center space-x-2">
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                          )}
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
                                  : 'bg-blue-200 border-blue-400'
                              } border-2 flex items-center justify-center`}
                              style={{
                                left: `${position.left}px`,
                                width: `${Math.max(position.width, 40)}px`
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