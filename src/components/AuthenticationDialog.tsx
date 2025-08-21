import React from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, User, Chrome } from 'lucide-react';

interface AuthenticationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuthenticationDialog: React.FC<AuthenticationDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { signInAnonymously, signInWithGoogle, isLoading } = useAuth();

  const handleAnonymousSignIn = async () => {
    await signInAnonymously();
    onOpenChange(false);
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Timeline Project</DialogTitle>
          <DialogDescription>
            Choose how you'd like to get started. You can always upgrade your account later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button
            onClick={handleAnonymousSignIn}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <User className="mr-2 h-4 w-4" />
            )}
            Continue as Guest
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>
          
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            Sign in with Google
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Guest mode:</strong> Your data is stored locally and will be lost if you clear your browser data.
          </p>
          <p>
            <strong>Google account:</strong> Your data is synced across devices and backed up securely.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};