import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react'; // ✅ Agregamos useContext
import { AuthProvider, AuthContext } from './context/AuthContext'; // ✅ Importamos AuthContext
import { ProtectedRoute } from './components/ProtectedRoute';

// Importación de vistas
import Login from './views/Login';
import Register from './views/Register';
import Dashboard from './views/Dashboard';
import OrganizationView from './views/OrganizationView';
import ProjectKanban from './views/ProjectKanban';
import AdminPanel from './views/AdminPanel';

import './styles/main.css';

// ✅ 1. Creamos el componente guardián exclusivo para Super Admins
const AdminRoute = ({ children }) => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) return <p>Cargando permisos...</p>;
  
  // Si existe un usuario logueado pero su rol NO es super_admin, lo pateamos
  if (user && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Rutas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/orgs/:orgId" element={<OrganizationView />} />
            <Route path="/projects/:projectId" element={<ProjectKanban />} />
            {/* Redirección por defecto para rutas protegidas */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* ✅ 2. Protegemos la ruta /admin envolviéndola en el guardián */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              } 
            />
          </Route>

          {/* Fallback para rutas inexistentes */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;