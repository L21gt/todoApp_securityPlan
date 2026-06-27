import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react'; 
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Importación de vistas
import Login from './views/Login';
import Register from './views/Register';
import Dashboard from './views/Dashboard';
import OrganizationView from './views/OrganizationView';
import ProjectKanban from './views/ProjectKanban';
import AdminPanel from './views/AdminPanel';

import './styles/main.css';

const AdminRoute = ({ children }) => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) return <p>Cargando permisos...</p>;
  
  if (user && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  // ✅ Estado global para el modo oscuro
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orgs/:orgId" element={<OrganizationView />} />
            <Route path="/projects/:projectId" element={<ProjectKanban />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/admin" element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        {/* ✅ Botón Flotante para Dark Mode */}
        <button 
          className="theme-toggle-btn" 
          onClick={() => setIsDarkMode(!isDarkMode)}
          title="Alternar Modo Oscuro"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>

      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;