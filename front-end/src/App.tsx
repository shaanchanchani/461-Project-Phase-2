import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PackageRegistry from './components/PackageRegistry';
import { LoginPage } from './components/LoginPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-b from-blue-500 to-blue-600">
              <PackageRegistry />
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}

export default App;