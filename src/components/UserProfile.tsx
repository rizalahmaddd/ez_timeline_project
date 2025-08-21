import { Link, LogOut, UserCheck } from 'lucide-react';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../hooks/use-toast';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const UserProfile: React.FC = () => {
  const { user, signOut, linkAnonymousWithGoogle } = useAuth();

  if (!user) return null;

  const handleLinkAccount = async () => {
    if (user.isAnonymous) {
      await linkAnonymousWithGoogle();
    } else {
      toast({
        title: "Account already linked",
        description: "Your account is already linked with Google."
      });
    }
  };

  const getUserDisplayName = () => {
    if (user.displayName) return user.displayName;
    if (user.email) return user.email;
    return 'Anonymous User';
  };

  const getUserRole = () => {
    switch (user.role) {
      case 'anonymous':
        return 'Guest';
      case 'google':
        return 'Google User';
      case 'linked':
        return 'Linked Account';
      default:
        return 'User';
    }
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    if (name === 'Anonymous User') return 'AU';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          {user.photoURL ? (
            <img
              className="h-8 w-8 rounded-full object-cover"
              src={user.photoURL}
              alt={getUserDisplayName()}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              {getUserInitials()}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getUserDisplayName()}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email || 'No email'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {getUserRole()}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {user.isAnonymous && (
          <>
            <DropdownMenuItem onClick={handleLinkAccount}>
              <Link className="mr-2 h-4 w-4" />
              Link with Google
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {user.role === 'linked' && (
          <>
            <DropdownMenuItem disabled>
              <UserCheck className="mr-2 h-4 w-4" />
              Account Linked
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};