import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { Agent } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  agentProfile: Agent | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string, department: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [agentProfile, setAgentProfile] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          // Fetch the user's profile from the 'agents' table
          const profile = await supabaseHelpers.getAgentById(currentUser.id);
          setAgentProfile(profile as Agent);
        } catch (error) {
          console.error('Error fetching agent profile', error);
          setAgentProfile(null);
        }
      } else {
        setAgentProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, name: string, department: string) => {
    try {
      // First, sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Create agent profile
        const { error: profileError } = await supabase
          .from('agents')
          .insert([
            {
              id: data.user.id,
              name,
              email,
              department,
            },
          ]);

        if (profileError) {
          return { error: 'Failed to create agent profile' };
        }
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      // Check if there's a valid session before attempting to sign out
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      // If there's no session or an error getting the session, just clear local state
      if (sessionError || !currentSession) {
        setUser(null);
        setSession(null);
        setAgentProfile(null);
        return;
      }

      // Only attempt to sign out if there's a valid session
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn('Sign out error (clearing local state anyway):', error.message);
      }
    } catch (error) {
      console.warn('Sign out failed (clearing local state anyway):', error);
    } finally {
      // Always clear local authentication state
      setUser(null);
      setSession(null);
      setAgentProfile(null);
    }
  };

  const value = {
    user,
    session,
    agentProfile,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};