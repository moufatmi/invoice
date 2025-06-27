import React, { useState } from 'react';
import AgentPortal from './components/AgentPortal';
import DirectorDashboard from './components/DirectorDashboard';
import LoginForm from './components/LoginForm';
import AuthForm from './components/AuthForm';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Invoice } from './types';
import { supabase, supabaseHelpers } from './lib/supabase';

function AppContent() {
  const [currentView, setCurrentView] = useState<'agent' | 'director-login' | 'director-dashboard'>('agent');
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [loginError, setLoginError] = useState<string>('');
  
  const { isAuthenticated, loading, signIn, signOut, agentProfile } = useAuth();

  const handleDirectorLogin = () => {
    setCurrentView('director-login');
  };

  const handleLogin = async (email: string, password: string) => {
    setLoginError('');
    const { error } = await signIn(email, password);

    if (error) {
      setLoginError(error);
      return;
    }
    // Note: onAuthStateChange in AuthContext will fire and update agentProfile.
    // However, the state update may not be synchronous.
    // For this login flow, we'll fetch the profile directly to ensure we have the role immediately.
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const profile = await supabaseHelpers.getAgentById(user.id);
        if (profile && profile.role === 'director') {
          setCurrentView('director-dashboard');
        } else {
          setLoginError('You do not have permission to access the director dashboard.');
          await signOut();
        }
      }
    } catch (e) {
      setLoginError('Failed to verify user role.');
      await signOut();
    }
  };

  const handleBackToAgent = () => {
    setCurrentView('agent');
    setLoginError('');
  };

  const handleLogoutDirector = async () => {
    await signOut();
    setCurrentView('agent');
    setLoginError('');
  };

  // Handle invoice creation from agent portal
  const handleInvoiceCreated = (invoice: Invoice) => {
    setAllInvoices(prev => [...prev, invoice]);
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show director login form
  if (currentView === 'director-login') {
    return (
      <LoginForm 
        onLogin={handleLogin} 
        error={loginError}
        onBack={handleBackToAgent}
      />
    );
  }

  // Show director dashboard
  if (currentView === 'director-dashboard') {
    return (
      <DirectorDashboard 
        onLogout={handleLogoutDirector}
      />
    );
  }

  // Show authentication form if not authenticated
  if (!isAuthenticated) {
    return <AuthForm onDirectorLogin={handleDirectorLogin} />;
  }

  // Show agent portal (default view when authenticated)
  return (
    <div className="transition-colors duration-200">
      <AgentPortal />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;