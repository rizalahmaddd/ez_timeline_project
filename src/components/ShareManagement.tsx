import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { useStore } from '../store/useStore';
import { shareService, projectService } from '../services/firebaseService';
import type { Project } from '../types';
import { toast } from '../hooks/use-toast';
import { Share2, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

interface ShareManagementProps {
  project: Project;
}

export const ShareManagement: React.FC<ShareManagementProps> = ({ project }) => {
  const { tasks, updateProject } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState(project.sharePassword || '');
  
  const projectTasks = tasks.filter(task => task.projectId === project.id);
  const shareUrl = project.shareId 
    ? `${window.location.origin}/shared/${project.shareId}`
    : '';

  const handleCreateShare = async () => {
    setIsLoading(true);
    try {
      const shareId = await shareService.createSharedProject(project, projectTasks, sharePassword || undefined);
      
      const updatedProject = {
        ...project,
        isShared: true,
        shareId,
        shareEnabled: true,
        sharePassword: sharePassword || undefined
      };
      
      updateProject(updatedProject);
      
      toast({
        title: "Project shared successfully",
        description: sharePassword 
          ? "Your project is now shared with password protection."
          : "Your project is now publicly accessible via the share link."
      });
    } catch (error) {
      console.error('Error creating share:', error);
      toast({
        title: "Error",
        description: "Failed to share project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleShare = async (enabled: boolean) => {
    if (!project.shareId) return;
    
    setIsLoading(true);
    try {
      if (enabled) {
        await shareService.enableSharing(project.id, project.shareId);
      } else {
        await shareService.disableSharing(project.id, project.shareId);
      }
      
      const updatedProject = {
        ...project,
        shareEnabled: enabled
      };
      
      updateProject(updatedProject);
      
      toast({
        title: enabled ? "Sharing enabled" : "Sharing disabled",
        description: enabled 
          ? "Your project is now publicly accessible."
          : "Your project is no longer publicly accessible."
      });
    } catch (error) {
      console.error('Error toggling share:', error);
      toast({
        title: "Error",
        description: "Failed to update sharing settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateShare = async () => {
    if (!project.shareId) return;
    
    setIsLoading(true);
    try {
      await shareService.updateSharedProject(project, projectTasks);
      
      toast({
        title: "Shared project updated",
        description: "The shared version now reflects your latest changes."
      });
    } catch (error) {
      console.error('Error updating share:', error);
      toast({
        title: "Error",
        description: "Failed to update shared project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Share link has been copied to your clipboard."
      });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: "Error",
        description: "Failed to copy link. Please copy it manually.",
        variant: "destructive"
      });
    }
  };

  const handleOpenShare = () => {
    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
  };

  const handleUpdatePassword = async () => {
    if (!project.shareId) return;
    
    setIsLoading(true);
    try {
      // Update password in shared project
      await shareService.updateSharePassword(project.shareId, sharePassword || undefined);
      
      // Update password in original project
      await projectService.updateProject(project.id, {
        sharePassword: sharePassword || undefined
      });
      
      const updatedProject = {
        ...project,
        sharePassword: sharePassword || undefined
      };
      
      updateProject(updatedProject);
      
      toast({
        title: "Password updated",
        description: sharePassword 
          ? "Password protection has been enabled."
          : "Password protection has been removed."
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Share your project timeline with others. They'll have read-only access.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {!project.isShared ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Share Link</CardTitle>
                <CardDescription>
                  Generate a public link to share your project timeline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="share-password">Password Protection (Optional)</Label>
                  <Input
                    id="share-password"
                    type="password"
                    placeholder="Enter password to protect this share"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave empty for public access, or set a password to restrict access.
                  </p>
                </div>
                <Button 
                  onClick={handleCreateShare} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Share Link
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Share Toggle */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Share Settings</CardTitle>
                  <CardDescription>
                    Control who can access your shared project.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="share-enabled">Public Access</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow anyone with the link to view this project
                      </p>
                    </div>
                    <Switch
                      id="share-enabled"
                      checked={project.shareEnabled ?? false}
                      onCheckedChange={handleToggleShare}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="update-password">Password Protection</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="update-password"
                        type="password"
                        placeholder={project.sharePassword ? "Enter new password" : "Set password (optional)"}
                        value={sharePassword}
                        onChange={(e) => setSharePassword(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        onClick={handleUpdatePassword}
                        disabled={isLoading || sharePassword === (project.sharePassword || '')}
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {project.sharePassword 
                        ? "Password protection is currently enabled. Clear and update to remove."
                        : "Set a password to restrict access to this shared project."
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Share Link */}
              {project.shareEnabled && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Share Link</CardTitle>
                    <CardDescription>
                      Anyone with this link can view your project timeline.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex space-x-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenShare}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={handleUpdateShare}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Update Shared Version
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};