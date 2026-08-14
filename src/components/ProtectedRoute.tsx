import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingScreen } from '@/pages/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';

type ProtectedRouteProps = {
  children?: React.ReactNode;
  role?: string; // optional future guard
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // Redirect unauthenticated users to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // All good, render the intended content
  return <>{children ?? null}</>;
};

export default ProtectedRoute;
