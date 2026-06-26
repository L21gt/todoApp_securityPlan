import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSecureSubmit } from '../hooks/useSecureSubmit';
import apiClient from '../api/axiosConfig';
import { OrganizationModal } from '../components/OrganizationModal';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { execute, error } = useSecureSubmit(() => apiClient.get('/orgs'));

  const fetchOrganizations = useCallback(async () => {
    const result = await execute();
    if (result.success) setOrganizations(result.data);
    setIsFetching(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrganizations();
  }, [fetchOrganizations]);

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <h1>Panel Principal</h1>
        <div className="user-controls">
          <span>Hola, <strong>{user?.name || 'Usuario'}</strong></span>
          <button onClick={logout} className="btn-danger">Cerrar Sesión</button>
          
          {/* ✅ Condicionamos el botón verificando el role del usuario */}
          {user?.role === 'super_admin' && (
            <button 
              className="btn-primary btn-auto btn-admin" 
              onClick={() => navigate('/admin')}
            >
              Panel Admin
            </button>
          )}
        </div>
      </header>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Mis Organizaciones</h2>
          <button className="btn-primary btn-auto" onClick={() => setIsModalOpen(true)}>
            + Nueva Organización
          </button>
        </div>

        {isFetching ? (
          <div className="empty-state">Cargando organizaciones...</div>
        ) : error ? (
          <div className="error-alert">{error}</div>
        ) : organizations.length === 0 ? (
          <div className="empty-state">
            <p>Aún no perteneces a ninguna organización.</p>
          </div>
        ) : (
          <div className="grid-container">
            {organizations.map((org) => {
              const roleDisplay = org.members.find(m => m.userId === user?._id)?.role === 'org_admin' ? 'Administrador' : 'Miembro';
              return (
                <div key={org._id} className="card">
                  <span className="badge">{roleDisplay}</span>
                  <h3 className="card-title">{org.name}</h3>
                  <div className="card-body">{org.description || 'Sin descripción.'}</div>
                  <button 
                        className="btn-primary" 
                        style={{ backgroundColor: '#4b5563' }}
                        onClick={() => navigate(`/orgs/${org._id}`)}
                    >
                        Entrar al Espacio
                    </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {isModalOpen && (
        <OrganizationModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchOrganizations} 
        />
      )}
    </div>
  );
};

export default Dashboard;