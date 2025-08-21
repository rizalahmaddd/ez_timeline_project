import { create } from 'zustand';
import type { AIMessage, Project, Task, User, ViewType } from '../types';

// Initialize sidebar state from localStorage
const initializeSidebarState = () => {
  try {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  } catch {
    return false;
  }
};

// Initialize timeline zoom from localStorage
const initializeTimelineZoom = () => {
  try {
    const saved = localStorage.getItem('timelineZoom');
    return saved ? JSON.parse(saved) : 100;
  } catch {
    return 100;
  }
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
}

interface TaskState {
  tasks: Task[];
}

interface UIState {
  currentView: ViewType;
  isProjectModalOpen: boolean;
  isTaskModalOpen: boolean;
  isAIChatOpen: boolean;
  isFloatingChatOpen: boolean;
  isSidebarCollapsed: boolean;
  timelineZoom: number;
}

interface AIState {
  aiMessages: AIMessage[];
  isAILoading: boolean;
}

interface ShareState {
  shareEnabled: boolean;
}

interface RealtimeState {
  isOnline: boolean;
  lastSyncTime: Date | null;
}

interface StoreActions {
  // Auth actions
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  
  // Project actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  setSelectedProject: (project: Project | null) => void;
  
  // Task actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  
  // UI actions
  setCurrentView: (view: ViewType) => void;
  setProjectModalOpen: (isOpen: boolean) => void;
  setTaskModalOpen: (isOpen: boolean) => void;
  setAIChatOpen: (isOpen: boolean) => void;
  setFloatingChatOpen: (isOpen: boolean) => void;
  setTimelineZoom: (zoom: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // AI actions
  addAIMessage: (message: AIMessage) => void;
  setAILoading: (isLoading: boolean) => void;
  clearAIMessages: () => void;
  
  // Share actions
  setShareEnabled: (enabled: boolean) => void;
  
  // Real-time sync actions
  setOnline: (online: boolean) => void;
  setLastSyncTime: (time: Date) => void;
}

type AppState = AuthState & ProjectState & TaskState & UIState & AIState & ShareState & RealtimeState & StoreActions;

export const useStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  isLoading: true,
  
  projects: [],
  selectedProject: null,
  
  tasks: [],
  
  currentView: 'daily', // Changed from 'weekly' to 'daily'
  isProjectModalOpen: false,
  isTaskModalOpen: false,
  isAIChatOpen: false,
  isFloatingChatOpen: false,
  isSidebarCollapsed: initializeSidebarState(),
  timelineZoom: initializeTimelineZoom(), // Timeline zoom percentage (50-200)
  
  aiMessages: [],
  isAILoading: false,
  
  shareEnabled: true,
  
  isOnline: true,
  lastSyncTime: null,
  
  // Auth actions
  setUser: (user: User | null) => set({ user }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  
  // Project actions
  setProjects: (projects: Project[]) => set({ projects }),
  setSelectedProject: (selectedProject: Project | null) => {
    // Save selected project to localStorage for persistence
    if (selectedProject) {
      localStorage.setItem('selectedProjectId', selectedProject.id);
      console.log('Saved selected project to localStorage:', selectedProject.name);
    } else {
      localStorage.removeItem('selectedProjectId');
      console.log('Removed selected project from localStorage');
    }
    set({ selectedProject });
  },
  addProject: (project: Project) => set((state: AppState) => ({ 
    projects: [...state.projects, project] 
  })),
  updateProject: (project: Project) => set((state: AppState) => ({
    projects: state.projects.map((p: Project) => p.id === project.id ? project : p),
    selectedProject: state.selectedProject?.id === project.id ? project : state.selectedProject
  })),
  deleteProject: (projectId: string) => set((state: AppState) => ({
    projects: state.projects.filter((p: Project) => p.id !== projectId),
    selectedProject: state.selectedProject?.id === projectId ? null : state.selectedProject
  })),
  
  // Task actions
  setTasks: (tasks: Task[]) => set({ tasks }),
  addTask: (task: Task) => set((state: AppState) => ({ 
    tasks: [...state.tasks, task] 
  })),
  updateTask: (task: Task) => set((state: AppState) => ({
    tasks: state.tasks.map((t: Task) => t.id === task.id ? task : t)
  })),
  deleteTask: (taskId: string) => set((state: AppState) => ({
    tasks: state.tasks.filter((t: Task) => t.id !== taskId)
  })),
  
  // UI actions
  setCurrentView: (currentView: ViewType) => set({ currentView }),
  setProjectModalOpen: (isProjectModalOpen: boolean) => set({ isProjectModalOpen }),
  setTaskModalOpen: (isTaskModalOpen: boolean) => set({ isTaskModalOpen }),
  setAIChatOpen: (isAIChatOpen: boolean) => set({ isAIChatOpen }),
  setFloatingChatOpen: (isFloatingChatOpen: boolean) => set({ isFloatingChatOpen }),
  setTimelineZoom: (zoom: number) => {
    const clampedZoom = Math.max(50, Math.min(200, zoom));
    set({ timelineZoom: clampedZoom });
    localStorage.setItem('timelineZoom', JSON.stringify(clampedZoom));
  },
  
  // AI actions
  addAIMessage: (message: AIMessage) => set((state: AppState) => ({
    aiMessages: [...state.aiMessages, message]
  })),
  setAILoading: (isAILoading: boolean) => set({ isAILoading }),
  clearAIMessages: () => set({ aiMessages: [] }),
  
  // Share actions
  setShareEnabled: (shareEnabled: boolean) => set({ shareEnabled }),
  
  // Real-time sync actions
  setOnline: (isOnline: boolean) => set({ isOnline }),
  setLastSyncTime: (lastSyncTime: Date) => set({ lastSyncTime }),
  setSidebarCollapsed: (isSidebarCollapsed: boolean) => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.toString());
    set({ isSidebarCollapsed });
  },
}));