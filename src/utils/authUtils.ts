import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '../types';

export const mapFirebaseUserToUser = (firebaseUser: FirebaseUser): User => {
  let role: User['role'] = 'anonymous';
  
  if (firebaseUser.isAnonymous) {
    role = 'anonymous';
  } else if (firebaseUser.providerData.some(p => p.providerId === 'google.com')) {
    // Check if this was originally an anonymous user that was linked
    const isLinked = firebaseUser.metadata.creationTime !== firebaseUser.metadata.lastSignInTime;
    role = isLinked ? 'linked' : 'google';
  }
  
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || undefined,
    displayName: firebaseUser.displayName || undefined,
    photoURL: firebaseUser.photoURL || undefined,
    isAnonymous: firebaseUser.isAnonymous,
    role
  };
};