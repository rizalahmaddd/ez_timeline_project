import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Loader2, MessageCircle, Send, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { commentService } from '../services/firebaseService';
import type { Comment } from '../types';
import { toast } from './ui/use-toast';

interface CommentsSectionProps {
  shareId: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ shareId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!shareId) return;

    const unsubscribe = commentService.subscribeToComments(shareId, (newComments) => {
      setComments(newComments);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [shareId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authorName.trim() || !content.trim()) {
      toast({
        title: "Incomplete form",
        description: "Please enter your name and comment.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await commentService.createComment({
        shareId,
        authorName: authorName.trim(),
        content: content.trim()
      });
      
      setContent('');
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully."
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="dense-padding">
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <span>Discussion ({comments.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="dense-padding space-y-4">
        {/* Comment Form */}
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={50}
              required
            />
          </div>
          <Textarea
            placeholder="Write your comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={3}
            required
          />
          <Button 
            type="submit" 
            disabled={isSubmitting || !authorName.trim() || !content.trim()}
            size="sm"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Post Comment
          </Button>
        </form>

        {/* Comments List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-6">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{comment.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(comment.createdAt, 'MMM dd, yyyy \u2022 HH:mm')}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};