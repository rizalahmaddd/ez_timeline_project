import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ExportOptions } from '../types';

interface ProjectData {
  project: {
    id: string;
    name: string;
    description?: string;
    [key: string]: unknown;
  };
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export class ExportService {
  async exportTimeline(
    timelineElement: HTMLElement,
    projectName: string,
    options: ExportOptions = { format: 'png', includeAISummary: false },
    aiSummary?: string
  ): Promise<void> {
    if (!timelineElement) {
      throw new Error('Timeline element not found');
    }

    try {
      // Find the actual timeline container
      let timelineContainer = timelineElement.querySelector('[data-timeline]') as HTMLElement;
      
      // If no data-timeline found, use the element itself if it looks like a timeline
      if (!timelineContainer) {
        // Check if the element itself is a timeline container
        if (timelineElement.classList.contains('timeline-container') || 
            timelineElement.querySelector('.timeline-grid') ||
            timelineElement.querySelector('.timeline-task')) {
          timelineContainer = timelineElement;
        } else {
          // Try to find any container with timeline content
          timelineContainer = timelineElement.querySelector('.timeline-grid')?.parentElement as HTMLElement ||
                             timelineElement.querySelector('.timeline-task')?.closest('.card') as HTMLElement ||
                             timelineElement;
        }
      }
      
      if (!timelineContainer) {
        throw new Error('Timeline container not found');
      }

      console.log('🎯 Export: Timeline container found', {
        width: timelineContainer.scrollWidth,
        height: timelineContainer.scrollHeight,
        offsetWidth: timelineContainer.offsetWidth,
        offsetHeight: timelineContainer.offsetHeight,
        visible: timelineContainer.offsetWidth > 0 && timelineContainer.offsetHeight > 0,
        hasTimelineTasks: !!timelineContainer.querySelector('.timeline-task'),
        hasTimelineGrid: !!timelineContainer.querySelector('.timeline-grid')
      });

      // Ensure the timeline is visible and has content
      if (timelineContainer.offsetWidth === 0 || timelineContainer.offsetHeight === 0) {
        throw new Error('Timeline is not visible or has no content to export');
      }

      // Check if timeline has actual task content
      const hasTaskContent = timelineContainer.querySelector('.timeline-task') || 
                            timelineContainer.querySelector('.timeline-grid');
      if (!hasTaskContent) {
        throw new Error('Timeline has no tasks to export. Please add tasks to your project first.');
      }

      // Add export mode class for styling
      timelineContainer.classList.add('timeline-export-mode');
      
      // Wait for any pending renders
      await new Promise(resolve => setTimeout(resolve, 100));

      // Hide interactive elements before capture
      const originalStyles: Array<{ element: Element; display: string }> = [];
      const interactiveElements = timelineContainer.querySelectorAll(
        'button, .export-hide, [data-export-hide], .timeline-task-actions'
      );
      
      interactiveElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        originalStyles.push({ element, display: htmlElement.style.display });
        htmlElement.style.display = 'none';
      });

      // Capture the timeline with html2canvas
      const canvas = await html2canvas(timelineContainer, {
        backgroundColor: '#ffffff',
        scale: 1.5, // Good balance between quality and performance
        useCORS: true,
        allowTaint: false,
        logging: true, // Enable logging for debugging
        width: timelineContainer.scrollWidth,
        height: timelineContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: true,
        onclone: (clonedDoc, clonedElement) => {
          console.log('🎯 Export: Cloning element', {
            originalWidth: timelineContainer.scrollWidth,
            originalHeight: timelineContainer.scrollHeight,
            clonedWidth: clonedElement.scrollWidth,
            clonedHeight: clonedElement.scrollHeight
          });
          
          // Apply export-specific styles to the cloned document
          const style = clonedDoc.createElement('style');
          style.textContent = `
            body { margin: 0; padding: 20px; background: white; }
            .timeline-export-mode { background: white !important; }
            .timeline-container { background: white !important; }
            .timeline-task:hover .timeline-task-actions { display: none !important; }
            button { display: none !important; }
            .export-hide { display: none !important; }
            [data-export-hide] { display: none !important; }
            .timeline-task { 
              border: 1px solid #e2e8f0 !important;
              box-shadow: none !important;
              background: white !important;
            }
            .timeline-grid {
              overflow: visible !important;
              background: white !important;
            }
            /* Improve text rendering for export */
            * {
              text-rendering: optimizeLegibility !important;
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
              color: #000 !important;
            }
            /* Ensure text is not truncated */
            .truncate {
              white-space: normal !important;
              overflow: visible !important;
              text-overflow: clip !important;
            }
            /* Improve timeline text visibility */
            .timeline-task p, .timeline-task-title, .timeline-task-description {
              white-space: normal !important;
              overflow: visible !important;
              text-overflow: clip !important;
              word-wrap: break-word !important;
              color: #000 !important;
            }
            /* Ensure minimum heights for better text display */
            .timeline-task {
              min-height: 60px !important;
              padding: 8px !important;
              background: white !important;
            }
            /* Force visibility of timeline elements */
            .timeline-container, .timeline-grid, .timeline-task {
              visibility: visible !important;
              opacity: 1 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      console.log('🎯 Export: Canvas created', {
        width: canvas.width,
        height: canvas.height,
        hasData: canvas.width > 0 && canvas.height > 0
      });

      // Restore original styles and remove export mode
      originalStyles.forEach(({ element, display }) => {
        (element as HTMLElement).style.display = display;
      });
      timelineContainer.classList.remove('timeline-export-mode');

      // Check if canvas has content
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Generated canvas is empty. Please ensure the timeline has visible content.');
      }

      if (options.format === 'png') {
        await this.exportAsPNG(canvas, projectName);
      } else if (options.format === 'pdf') {
        await this.exportAsPDF(canvas, projectName, options.includeAISummary ? aiSummary : undefined);
      }
    } catch (error) {
      console.error('Export error:', error);
      throw new Error(`Failed to export timeline: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async exportAsPNG(canvas: HTMLCanvasElement, projectName: string): Promise<void> {
    // Convert canvas to blob with compression
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/png', 0.8); // Reduced quality for compression
    });

    if (!blob) {
      throw new Error('Failed to create PNG blob');
    }

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.sanitizeFilename(projectName)}_timeline.png`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  }

  private async exportAsPDF(
    canvas: HTMLCanvasElement, 
    projectName: string, 
    aiSummary?: string
  ): Promise<void> {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true // Enable PDF compression
    });

    // PDF dimensions
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Calculate scaling to fit the page with margins
    const margin = 15;
    const availableWidth = pdfWidth - (margin * 2);
    const availableHeight = pdfHeight - 50; // Space for header
    
    const ratio = Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight);
    const scaledWidth = canvasWidth * ratio;
    const scaledHeight = canvasHeight * ratio;
    
    // Center the image
    const x = (pdfWidth - scaledWidth) / 2;
    const y = 40;

    // Add title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(projectName, margin, 20);
    
    // Add timestamp
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const timestamp = new Date().toLocaleString();
    pdf.text(`Generated on: ${timestamp}`, margin, 30);

    // Add timeline image with compression
    const imgData = canvas.toDataURL('image/jpeg', 0.7); // Use JPEG with compression
    pdf.addImage(imgData, 'JPEG', x, y, scaledWidth, scaledHeight);

    // Add AI summary if provided
    if (aiSummary) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AI Project Summary', margin, 20);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Split text into lines that fit the page
      const lines = pdf.splitTextToSize(aiSummary, pdfWidth - (margin * 2));
      pdf.text(lines, margin, 35);
    }

    // Save the PDF
    pdf.save(`${this.sanitizeFilename(projectName)}_timeline.pdf`);
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters for filenames
    return filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  async exportProjectData(projectName: string, projectData: ProjectData): Promise<void> {
    try {
      const dataStr = JSON.stringify(projectData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.sanitizeFilename(projectName)}_data.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export data error:', error);
      throw new Error('Failed to export project data. Please try again.');
    }
  }

  async importProjectData(file: File): Promise<ProjectData> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Basic validation
      if (!data.project || !data.tasks) {
        throw new Error('Invalid project data format');
      }
      
      return data;
    } catch (error) {
      console.error('Import data error:', error);
      throw new Error('Failed to import project data. Please check the file format.');
    }
  }
}

export const exportService = new ExportService();