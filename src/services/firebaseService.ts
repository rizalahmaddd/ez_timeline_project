import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Project, Task, SharedProject, Comment } from '../types';

// Helper function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: unknown): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date((timestamp as { seconds: number }).seconds * 1000);
  }
  return new Date(timestamp as string | number | Date);
};

// Tambahkan helper untuk validasi tanggal
const isValidDate = (d: unknown): d is Date => d instanceof Date && !isNaN(d.getTime());

// Project Services
export const projectService = {
  // Get all projects for a user
  async getUserProjects(userId: string): Promise<Project[]> {
    const q = query(
      collection(db, 'projects'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt)
    })) as Project[];
  },

  // Listen to user projects in real-time
  subscribeToUserProjects(userId: string, callback: (projects: Project[]) => void) {
    const q = query(
      collection(db, 'projects'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: timestampToDate(doc.data().createdAt),
        updatedAt: timestampToDate(doc.data().updatedAt)
      })) as Project[];
      callback(projects);
    });
  },

  // Create a new project
  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'projects'), {
      ...project,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Update a project
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  // Delete a project and all its tasks
  async deleteProject(projectId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Delete the project
    const projectRef = doc(db, 'projects', projectId);
    batch.delete(projectRef);
    
    // Delete all tasks for this project
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('projectId', '==', projectId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.docs.forEach((taskDoc: QueryDocumentSnapshot<DocumentData>) => {
      batch.delete(taskDoc.ref);
    });
    
    await batch.commit();
  },

  // Get a single project
  async getProject(projectId: string): Promise<Project | null> {
    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: timestampToDate(docSnap.data().createdAt),
        updatedAt: timestampToDate(docSnap.data().updatedAt)
      } as Project;
    }
    return null;
  }
};

// Task Services
export const taskService = {
  // Get all tasks for a project
  async getProjectTasks(projectId: string): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('projectId', '==', projectId),
      orderBy('startDate', 'asc')
    );
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
      startDate: timestampToDate(doc.data().startDate),
      endDate: timestampToDate(doc.data().endDate),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt)
    })) as Task[];

    // Filter task dengan tanggal invalid agar tidak membuat UI crash
    const validTasks = tasks.filter(t => {
      const ok = isValidDate(t.startDate) && isValidDate(t.endDate);
      if (!ok) {
        console.warn('[taskService.getProjectTasks] Skip task dengan tanggal invalid:', t.id, t);
      }
      return ok;
    });

    return validTasks;
  },

  // Listen to project tasks in real-time
  subscribeToProjectTasks(projectId: string, callback: (tasks: Task[]) => void) {
    const q = query(
      collection(db, 'tasks'),
      where('projectId', '==', projectId),
      orderBy('startDate', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
        startDate: timestampToDate(doc.data().startDate),
        endDate: timestampToDate(doc.data().endDate),
        createdAt: timestampToDate(doc.data().createdAt),
        updatedAt: timestampToDate(doc.data().updatedAt)
      })) as Task[];

      // Filter task dengan tanggal invalid
      const validTasks = tasks.filter(t => {
        const ok = isValidDate(t.startDate) && isValidDate(t.endDate);
        if (!ok) {
          console.warn('[taskService.subscribeToProjectTasks] Skip task dengan tanggal invalid:', t.id, t);
        }
        return ok;
      });

      callback(validTasks);
    });
  },

  // Create a new task
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...task,
      startDate: Timestamp.fromDate(task.startDate),
      endDate: Timestamp.fromDate(task.endDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Update a task
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    // Convert dates to Firestore timestamps
    if (updates.startDate) {
      (updateData as Record<string, unknown>).startDate = Timestamp.fromDate(updates.startDate);
    }
    if (updates.endDate) {
      (updateData as Record<string, unknown>).endDate = Timestamp.fromDate(updates.endDate);
    }
    
    await updateDoc(taskRef, updateData);
  },

  // Delete a task
  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
  },

  // Toggle task completion
  async toggleTaskCompletion(taskId: string, completed: boolean): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);
    const status = completed ? 'done' : 'todo';
    await updateDoc(taskRef, {
      completed,
      status,
      updatedAt: serverTimestamp()
    });
  }
};

// Share Services
export const shareService = {
  // Create a shared project
  async createSharedProject(project: Project, tasks: Task[], password?: string): Promise<string> {
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sharedProject: Omit<SharedProject, 'id'> = {
      projectId: project.id,
      shareId,
      projectData: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        isShared: true
      },
      tasks: tasks.map(task => ({ ...task })),
      createdAt: new Date(),
      isActive: true,
      sharePassword: password || undefined
    };
    
    await addDoc(collection(db, 'sharedProjects'), {
      ...sharedProject,
      createdAt: serverTimestamp()
    });
    
    // Update the original project with share info
    await projectService.updateProject(project.id, {
      isShared: true,
      shareId,
      shareEnabled: true,
      sharePassword: password || undefined
    });
    
    return shareId;
  },

  // Get a shared project
  async getSharedProject(shareId: string): Promise<SharedProject | null> {
    const q = query(
      collection(db, 'sharedProjects'),
      where('shareId', '==', shareId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    // Convert nested projectData dates and each task's dates to Date
    const projectData = {
      ...data.projectData,
      createdAt: timestampToDate(data.projectData?.createdAt),
      updatedAt: timestampToDate(data.projectData?.updatedAt),
    };

    const tasks = (data.tasks || []).map((t: Record<string, unknown>) => ({
      ...t,
      startDate: timestampToDate(t.startDate),
      endDate: timestampToDate(t.endDate),
      createdAt: timestampToDate(t.createdAt),
      updatedAt: timestampToDate(t.updatedAt),
    }));

    return {
      id: docSnap.id,
      projectId: data.projectId,
      shareId: data.shareId,
      projectData,
      tasks,
      createdAt: timestampToDate(data.createdAt),
      isActive: data.isActive,
      sharePassword: data.sharePassword || null,
    } as SharedProject;
  },

  // Update shared project
  async updateSharedProject(project: Project, tasks: Task[]): Promise<void> {
    if (!project.shareId) return;
    
    const q = query(
      collection(db, 'sharedProjects'),
      where('shareId', '==', project.shareId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, {
        projectData: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          isShared: true
        },
        tasks: tasks.map(task => ({ ...task }))
      });
    }
  },

  // Disable sharing
  async disableSharing(projectId: string, shareId: string): Promise<void> {
    // Update the project
    await projectService.updateProject(projectId, {
      shareEnabled: false
    });
    
    // Deactivate the shared project
    const q = query(
      collection(db, 'sharedProjects'),
      where('shareId', '==', shareId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, {
        isActive: false
      });
    }
  },

  // Re-enable sharing
  async enableSharing(projectId: string, shareId: string): Promise<void> {
    // Update the project
    await projectService.updateProject(projectId, {
      shareEnabled: true
    });
    
    // Reactivate the shared project
    const q = query(
      collection(db, 'sharedProjects'),
      where('shareId', '==', shareId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, {
        isActive: true
      });
    }
  },

  // Update share password
  async updateSharePassword(shareId: string, password?: string): Promise<void> {
    const q = query(
      collection(db, 'sharedProjects'),
      where('shareId', '==', shareId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, {
        sharePassword: password || null
      });
    }
  }
};

// Comment Services
export const commentService = {
  // Get all comments for a shared project
  async getComments(shareId: string): Promise<Comment[]> {
    const q = query(
      collection(db, 'comments'),
      where('shareId', '==', shareId),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt)
    })) as Comment[];
  },

  // Listen to comments in real-time
  subscribeToComments(shareId: string, callback: (comments: Comment[]) => void) {
    const q = query(
      collection(db, 'comments'),
      where('shareId', '==', shareId),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: timestampToDate(doc.data().createdAt),
        updatedAt: timestampToDate(doc.data().updatedAt)
      })) as Comment[];
      callback(comments);
    });
  },

  // Create a new comment
  async createComment(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'comments'), {
      ...comment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Delete a comment (optional - for moderation)
  async deleteComment(commentId: string): Promise<void> {
    const commentRef = doc(db, 'comments', commentId);
    await deleteDoc(commentRef);
  }
};