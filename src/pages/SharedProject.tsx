import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { AlertCircle, ExternalLink, Loader2, Share2, Lock, BarChart3, MessageCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { ReadOnlyTimeline } from '../components/ReadOnlyTimeline';
import { ViewToggle } from '../components/ViewToggle';
import { ProjectSummary } from '../components/ProjectSummary';
import { CommentsSection } from '../components/CommentsSection';
import { PasswordDialog } from '../components/PasswordDialog';
import { shareService } from '../services/firebaseService';
import type { SharedProject as SharedProjectType } from '../types';

export const SharedProject: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [sharedProject, setSharedProject] = useState<SharedProjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    const loadSharedProject = async () => {
      if (!shareId) {
        setError('Invalid share link - Share ID is missing');
        setLoading(false);
        return;
      }

      try {
        console.log('Loading shared project with ID:', shareId);
        const project = await shareService.getSharedProject(shareId);
        
        if (!project) {
          console.log('No project found for shareId:', shareId);
          setError('Project not found or no longer shared. The link may be invalid or expired.');
        } else {
          console.log('Successfully loaded shared project:', project);
          // Check if password is required
          if (project.sharePassword && !isAuthenticated) {
            setIsPasswordRequired(true);
            setShowPasswordDialog(true);
            setSharedProject(project);
          } else {
            setSharedProject(project);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error('Error loading shared project:', err);
        setError(`Failed to load shared project: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadSharedProject();
  }, [shareId, isAuthenticated]);

  // Password handling functions
  const handlePasswordSubmit = (password: string) => {
    if (sharedProject && sharedProject.sharePassword === password) {
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      toast({
        title: 'Success',
        description: 'Access granted!'
      });
    } else {
      toast({
        title: 'Error',
        description: 'Incorrect password. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordDialog(false);
    navigate('/');
  };

  // No edit/delete functions in read-only mode

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading shared project...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !sharedProject) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Project Not Available</h2>
                <p className="text-muted-foreground mb-4">
                  {error || 'This project is no longer shared or does not exist.'}
                </p>
                <Button 
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Go to Timeline App
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show password dialog if password is required and not authenticated
  if (isPasswordRequired && !isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Password Protected</h2>
                  <p className="text-muted-foreground mb-4">
                    This shared project requires a password to access.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <PasswordDialog
          isOpen={showPasswordDialog}
          onPasswordSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto dense-container space-y-3">
        {/* Header */}
        <Card>
          <CardHeader className="dense-padding">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Share2 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Shared Project</span>
                </div>
                <CardTitle className="text-2xl">
                  {sharedProject.projectData.name}
                </CardTitle>
                {sharedProject.projectData.description && (
                  <CardDescription className="mt-2">
                    {sharedProject.projectData.description}
                  </CardDescription>
                )}
              </div>
              
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Timeline App
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="dense-padding">
            <div className="text-sm text-muted-foreground">
              <p>Created: {format(sharedProject.projectData.createdAt, 'MMM dd, yyyy')}</p>
              <p>Last updated: {format(sharedProject.projectData.updatedAt, 'MMM dd, yyyy')}</p>
              <p>{sharedProject.tasks.length} tasks</p>
            </div>
          </CardContent>
        </Card>

        {/* Read-Only Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-amber-600" />
            <span className="text-amber-800 font-medium">Read-Only Mode</span>
            <span className="text-amber-600">This is a shared project - no editing allowed</span>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Summary</span>
            </TabsTrigger>
            <TabsTrigger value="discussion" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Discussion</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Project Timeline</h2>
              <div className="flex items-center space-x-2">
                <ViewToggle />
                <div className="text-sm text-muted-foreground">
                  Read-only view
                </div>
              </div>
            </div>
            <ReadOnlyTimeline tasks={sharedProject.tasks} />
            
            {/* Tasks Summary */}
            {sharedProject.tasks && sharedProject.tasks.length > 0 && (
              <Card>
                <CardHeader className="dense-padding">
                  <CardTitle>Tasks Summary</CardTitle>
                </CardHeader>
                <CardContent className="dense-padding">
                  <div className="space-y-3">
                    {sharedProject.tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex-1">
                          <p className={`font-medium ${
                            task.completed ? 'line-through text-muted-foreground' : ''
                          }`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}
                        </div>
                        <div className={`ml-4 px-2 py-1 rounded-full text-xs ${
                          task.completed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {task.completed ? 'Completed' : 'Pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="summary" className="space-y-4">
            <ProjectSummary 
              projectName={sharedProject.projectData.name}
              tasks={sharedProject.tasks}
            />
          </TabsContent>
          
          <TabsContent value="discussion" className="space-y-4">
            <CommentsSection shareId={sharedProject.shareId} />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              This is a read-only view of a shared project timeline.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="mx-auto"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Create Your Own Timeline
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};