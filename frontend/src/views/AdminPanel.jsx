import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSecureSubmit } from '../hooks/useSecureSubmit';
import apiClient from '../api/axiosConfig';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  // Endpoints administrativos definidos en el requerimiento
  const fetchUsersApi = useCallback(() => apiClient.get('/admin/users'), []);
  const fetchLogsApi = useCallback(() => apiClient.get('/admin/audit-logs'), []);
  
  const { execute: fetchUsers, isLoading: loadingUsers } = useSecureSubmit(fetchUsersApi);
  const { execute: fetchLogs, isLoading: loadingLogs } = useSecureSubmit(fetchLogsApi);
  const { execute: deactivateUser } = useSecureSubmit((data) => apiClient.put(`/admin/users/${data.id}/status`, { isActive: false }));

  const loadData = useCallback(async () => {
    if (activeTab === 'users') {
      const res = await fetchUsers();
      if (res.success) setUsers(res.data);
    } else {
      const res = await fetchLogs();
      if (res.success) setLogs(res.data);
    }
  }, [activeTab, fetchUsers, fetchLogs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleDeactivate = async (userId) => {
    if (window.confirm("¿Estás seguro de que deseas desactivar esta cuenta?")) {
      const res = await deactivateUser({ id: userId }); 
      if (res.success) loadData();
    }
  };

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div>
          <button className="btn-primary btn-auto" onClick={() => navigate(-1)} style={{ marginBottom: '1rem', backgroundColor: '#4b5563' }}>
            &larr; Volver
          </button>
          <h1>Panel de Super Admin</h1>
        </div>
      </header>

      <div className="tab-container">
        <button className={`btn-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          Gestión de Usuarios
        </button>
        <button className={`btn-tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          Logs de Auditoría
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="admin-table-container">
          {loadingUsers ? <p style={{ padding: '1rem' }}>Cargando usuarios...</p> : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <span style={{ color: u.isActive ? 'green' : 'red', fontWeight: 'bold' }}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      {u.isActive && u.role !== 'super_admin' && (
                        <button className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeactivate(u._id)}>
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="admin-table-container">
          {loadingLogs ? <p style={{ padding: '1rem' }}>Cargando logs...</p> : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Acción</th>
                  <th>Actor (ID)</th>
                  <th>Recurso</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => {
                  const logDate = log.timestamp || log.createdAt;
                  const displayDate = logDate ? new Date(logDate).toLocaleString() : 'Fecha desconocida';

                  // Leemos 'log.user' (como lo envía el backend) o usamos el fallback
                  const displayActor = log.user || log.actorId || 'Sistema / Anónimo';

                  // Procesamos el objeto 'log.details' del backend
                  let displayResource = 'General (N/A)';
                  if (log.resourceType || log.resourceId) {
                    displayResource = `${log.resourceType || 'General'} (${log.resourceId || 'N/A'})`;
                  } else if (log.details && Object.keys(log.details).length > 0) {
                    // Si el error tiene un motivo, lo mostramos. Si no, mostramos el objeto.
                    displayResource = log.details.reason || JSON.stringify(log.details);
                  }

                  return (
                    <tr key={log._id || index}>
                      <td>{displayDate}</td>
                      <td><strong>{log.action || 'Acción desconocida'}</strong></td>
                      <td>{displayActor}</td>
                      {/* ✅ FIX: Usamos la clase CSS externa en lugar de estilos en línea */}
                      <td className="truncate-cell" title={displayResource}>
                        {displayResource}
                      </td>
                      <td>{log.ip || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;