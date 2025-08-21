import React from 'react';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { useStore } from '../store/useStore';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export const TimelineZoomSlider: React.FC = () => {
  const { timelineZoom, setTimelineZoom } = useStore();

  const handleZoomChange = (value: number[]) => {
    if (value && value.length > 0) {
      setTimelineZoom(value[0]);
    }
  };

  const handleZoomIn = () => {
    setTimelineZoom(Math.min(200, timelineZoom + 25));
  };

  const handleZoomOut = () => {
    setTimelineZoom(Math.max(50, timelineZoom - 25));
  };

  const handleReset = () => {
    setTimelineZoom(100);
  };

  return (
    <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleZoomOut}
        disabled={timelineZoom <= 50}
        className="h-8 w-8 p-0"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center space-x-2 min-w-[120px]">
        <Slider
          value={[timelineZoom]}
          onValueChange={handleZoomChange}
          min={50}
          max={200}
          step={25}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground min-w-[35px] text-center">
          {timelineZoom}%
        </span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleZoomIn}
        disabled={timelineZoom >= 200}
        className="h-8 w-8 p-0"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleReset}
        className="h-8 w-8 p-0"
        title="Reset zoom"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
};