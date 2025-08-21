export interface User {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  isAnonymous: boolean;
  role: 'anonymous' | 'google' | 'linked';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isShared?: boolean;
  shareId?: string;
  shareEnabled?: boolean;
  sharePassword?: string;
  notes?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  status?: TaskStatus;
}

export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'pending' | 'blocked';

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  status: TaskStatus;
}

export interface SharedProject {
  id: string;
  projectId: string;
  shareId: string;
  projectData: Omit<Project, 'userId'>;
  tasks: Task[];
  createdAt: Date;
  isActive: boolean;
  sharePassword?: string;
}

export type ViewType = 'daily' | 'weekly' | 'monthly' | 'kanban';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIResponse {
  action: 'create_project' | 'add_task' | 'answer_question';
  data?: {
    projectName?: string;
    projectDescription?: string;
    taskTitle?: string;
    taskDescription?: string;
    startDate?: string;
    endDate?: string;
  };
  message: string;
}

export interface ExportOptions {
  format: 'png' | 'pdf';
  includeAISummary: boolean;
}

export interface Comment {
  id: string;
  shareId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}