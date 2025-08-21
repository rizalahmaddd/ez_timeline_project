import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useStore } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
import { projectService, taskService } from '../services/firebaseService';
import type { AIMessage, Project, Task } from '../types';
import { toast } from '../hooks/use-toast';
import { Send, Bot, User, Loader2, X, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

export const FloatingAIChat: React.FC = () => {
  const { user } = useAuth();
  const {
    isFloatingChatOpen,
    aiMessages,
    isAILoading,
    setFloatingChatOpen,
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
  }, [aiMessages, isAILoading]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (isFloatingChatOpen && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isFloatingChatOpen]);

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

    // Add current date context
    const currentDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const contextualMessage = `Hari ini adalah ${currentDate}. ${inputMessage.trim()}`;

    try {
      const response = await aiService.processUserMessage(
        contextualMessage,
        getProjectContext()
      );

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
        content: 'Maaf, saya mengalami kesulitan memproses permintaan Anda saat ini. Silakan coba lagi nanti.',
        timestamp: new Date()
      };
      
      addAIMessage(errorMessage);
    } finally {
      setAILoading(false);
      // Keep focus on input after sending
      setTimeout(() => {
        const inputElement = document.querySelector('#chat-input') as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
        }
      }, 100);
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
        completed: false,
        status: 'todo'
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
    <>
      {/* Floating Chat Button */}
      {!isFloatingChatOpen && (
        <Button
          onClick={() => setFloatingChatOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
          size="lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Floating Chat Window */}
      {isFloatingChatOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-xl z-50 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Bot className="h-4 w-4" />
                <span>AI Assistant</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFloatingChatOpen(false)}
                className="p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col space-y-3 p-4">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-h-96">
              {aiMessages.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  <Bot className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">Hi! I'm your AI assistant.</p>
                  <p className="text-xs mt-1">
                    I can help you create projects, add tasks, and answer questions.
                  </p>
                </div>
              )}
              
              {aiMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && (
                        <Bot className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      )}
                      {message.role === 'user' && (
                        <User className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs whitespace-pre-wrap break-words">{message.content}</p>
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
                  <div className="bg-muted rounded-lg p-2">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-3 w-3" />
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <div className="flex space-x-2">
              <Input
                id="chat-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isAILoading}
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isAILoading}
                size="sm"
              >
                {isAILoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};