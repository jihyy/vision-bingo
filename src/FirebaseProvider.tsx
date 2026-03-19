import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  login: (nickname: string, pass: string) => Promise<void>;
  signup: (nickname: string, pass: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Set persistence to session by default
  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch(err => {
      console.error('Persistence error:', err);
    });
  }, []);

  // Helper to convert nickname to a dummy email for Firebase Auth
  const nicknameToEmail = (nickname: string) => `${nickname.trim()}@visionbingo.com`;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Sync user to Firestore
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0],
              photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
              createdAt: serverTimestamp(),
            });
          }
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state sync error:', error);
        // Even if sync fails, we should let the user proceed if they are authenticated
        if (currentUser) {
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (nickname: string, pass: string) => {
    const email = nicknameToEmail(nickname);
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = async (nickname: string, pass: string) => {
    const email = nicknameToEmail(nickname);
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, {
      displayName: nickname
    });
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, loading, logout, login, signup }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
