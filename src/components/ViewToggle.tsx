import React from 'react';
import { Button } from './ui/button';
import { useStore } from '../store/useStore';
import type { ViewType } from '../types';
import { Calendar, CalendarDays, CalendarRange, Kanban } from 'lucide-react';

export const ViewToggle: React.FC = () => {
  const { currentView, setCurrentView } = useStore();

  const views: { value: ViewType; label: string; icon: React.ReactNode }[] = [
    {
      value: 'daily',
      label: 'Daily',
      icon: <Calendar className="h-4 w-4" />
    },
    {
      value: 'weekly',
      label: 'Weekly',
      icon: <CalendarDays className="h-4 w-4" />
    },
    {
      value: 'monthly',
      label: 'Monthly',
      icon: <CalendarRange className="h-4 w-4" />
    },
    {
      value: 'kanban',
      label: 'Kanban',
      icon: <Kanban className="h-4 w-4" />
    }
  ];

  return (
    <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
      {views.map((view) => (
        <Button
          key={view.value}
          variant={currentView === view.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentView(view.value)}
          className="flex items-center space-x-2"
        >
          {view.icon}
          <span>{view.label}</span>
        </Button>
      ))}
    </div>
  );
};