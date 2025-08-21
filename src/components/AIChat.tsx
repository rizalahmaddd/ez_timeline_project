import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useStore } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
import { projectService, taskService } from '../services/firebaseService';
import type { AIMessage, Project, Task } from '../types';
import { toast } from '../hooks/use-toast';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const AIChat: React.FC = () => {
  const { user } = useAuth();
  const {
    isAIChatOpen,
    aiMessages,
    isAILoading,
    setAIChatOpen,
    addAIMessage,
    setAILoading,

    addProject,
    addTask,
    selectedProject,
    setSelectedProject
  } = useStore();
  
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages]);

  const getProjectContext = (): string => {
    if (!selectedProject) return '';
    
    return `Current project: "${selectedProject.name}" - ${selectedProject.description}`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAILoading) return;

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use the AI assistant.",
        variant: "destructive"
      });
      return;
    }

    if (!aiService.validateAPIKey()) {
      toast({
        title: "AI service unavailable",
        description: "Gemini API key is not configured. Please check your environment variables.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    addAIMessage(userMessage);
    setInputMessage('');
    setAILoading(true);

    try {
      const response = await aiService.processUserMessage(
        inputMessage.trim(),
        getProjectContext()
      );

      console.log('AI Response:', response); // Debug log

      let finalMessage = response.message;

      // Handle different AI actions
      switch (response.action) {
        case 'create_project':
          if (response.data?.projectName) {
            try {
              await handleCreateProject(
                response.data.projectName,
                response.data.projectDescription || 'Project created by AI Assistant'
              );
              // Use AI's natural message, but add success confirmation
              finalMessage = `${response.message} Project "${response.data.projectName}" telah berhasil dibuat dan sudah aktif. Anda bisa mulai menambahkan task atau bertanya tentang hal lain.`;
            } catch {
              finalMessage = `Maaf, terjadi kesalahan saat membuat project "${response.data.projectName}". Silakan coba lagi.`;
            }
          } else {
            finalMessage = 'Maaf, saya membutuhkan nama project yang jelas untuk membuatkannya. Bisa Anda sebutkan nama project yang ingin dibuat?';
          }
          break;
          
        case 'add_task':
          if (response.data?.taskTitle && selectedProject) {
            try {
              await handleAddTask(
                response.data.taskTitle,
                response.data.taskDescription || '',
                response.data.startDate || format(new Date(), 'yyyy-MM-dd'),
                response.data.endDate || format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
              );
              // Use AI's natural message, but add success confirmation
              finalMessage = `${response.message} Task "${response.data.taskTitle}" telah berhasil ditambahkan ke project "${selectedProject.name}".`;
            } catch {
              finalMessage = `Maaf, terjadi kesalahan saat menambahkan task "${response.data.taskTitle}". Silakan coba lagi.`;
            }
          } else if (!selectedProject) {
            finalMessage = 'Untuk menambahkan task, Anda perlu memilih project terlebih dahulu. Silakan pilih project dari sidebar atau buat project baru.';
          } else {
            finalMessage = 'Saya membutuhkan nama task yang jelas untuk menambahkannya. Bisa Anda sebutkan task apa yang ingin ditambahkan?';
          }
          break;
          
        case 'answer_question':
        default:
          // Use the original AI response message as is
          break;
      }

      const aiMessage: AIMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: finalMessage,
        timestamp: new Date()
      };

      addAIMessage(aiMessage);
    } catch (error) {
      console.error('AI Chat error:', error);
      
      const errorMessage: AIMessage = {
        id: `ai_error_${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble processing your request right now. Please try again later.',
        timestamp: new Date()
      };
      
      addAIMessage(errorMessage);
    } finally {
      setAILoading(false);
    }
  };

  const handleCreateProject = async (name: string, description: string) => {
    try {
      const newProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        description,
        userId: user!.uid
      };
      
      const projectId = await projectService.createProject(newProject);
      
      const createdProject: Project = {
        ...newProject,
        id: projectId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      addProject(createdProject);
      setSelectedProject(createdProject);
      
      toast({
        title: "Project created by AI",
        description: `"${name}" has been created and selected.`
      });
    } catch (error) {
      console.error('Error creating project via AI:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddTask = async (
    title: string,
    description: string,
    startDate: string,
    endDate: string
  ) => {
    try {
      const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        projectId: selectedProject!.id,
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        completed: false
      };
      
      const taskId = await taskService.createTask(newTask);
      
      const createdTask: Task = {
        ...newTask,
        id: taskId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      addTask(createdTask);
      
      toast({
        title: "Task created by AI",
        description: `"${title}" has been added to your project.`
      });
    } catch (error) {
      console.error('Error creating task via AI:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={isAIChatOpen} onOpenChange={setAIChatOpen}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>AI Assistant</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col space-y-4">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {aiMessages.length === 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="text-center text-muted-foreground">
                    <Bot className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">Hi! I'm your AI assistant.</p>
                    <p className="text-sm mt-1">
                      I can help you create projects, add tasks, and answer questions about project management.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {aiMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    {message.role === 'user' && (
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(message.timestamp, 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isAILoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4" />
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to create projects, add tasks, or answer questions..."
              disabled={isAILoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isAILoading}
              size="sm"
            >
              {isAILoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};