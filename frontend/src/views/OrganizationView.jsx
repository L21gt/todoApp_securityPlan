import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSecureSubmit } from '../hooks/useSecureSubmit';
import apiClient from '../api/axiosConfig';
import { ProjectModal } from '../components/ProjectModal';

const OrganizationView = () => {
  const { orgId } = useParams(); // Obtenemos el ID de la URL
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ✅ FIX: Memorizamos la petición de proyectos
  const fetchOrgProjectsApi = useCallback(() => apiClient.get(`/orgs/${orgId}/projects`), [orgId]);
  const { execute, error } = useSecureSubmit(fetchOrgProjectsApi);

  const fetchProjects = useCallback(async () => {
    const result = await execute();
    if (result.success) {
      setProjects(result.data);
    }
    setIsFetching(false);
  }, [execute]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [fetchProjects]);

  // ✅ Función rápida para invitar a un usuario durante la demostración
  const handleInviteMember = async () => {
    const email = window.prompt("Ingresa el correo electrónico del usuario que deseas invitar:");
    if (!email) return;

    try {
      // Llamamos al endpoint definido en tu rúbrica
      await apiClient.post(`/orgs/${orgId}/members`, { email, role: 'member' });
      alert(`¡Usuario ${email} invitado exitosamente a la organización!`);
    } catch (err) {
      alert("Error al invitar: " + (err.response?.data?.error || err.message));
    }
  };

  // ✅ Función para editar la organización
  const handleEditOrg = async () => {
    const newName = window.prompt("Ingresa el nuevo nombre de la organización:");
    if (!newName) return;

    try {
      await apiClient.put(`/orgs/${orgId}`, { name: newName });
      alert("Organización actualizada exitosamente.");
    } catch (err) {
      alert("Error al editar: " + (err.response?.data?.error || err.message));
    }
  };

  // ✅ Función para eliminar la organización
  const handleDeleteOrg = async () => {
    if (window.confirm("🚨 ¿Deseas eliminar esta organización por completo?")) {
      try {
        await apiClient.delete(`/orgs/${orgId}`);
        alert("Organización eliminada.");
        navigate('/dashboard'); // Regresamos al panel principal
      } catch (err) {
        alert("Error al eliminar: " + (err.response?.data?.error || err.message));
      }
    }
  };

  // ✅ Función para remover a un miembro por CORREO
  const handleRemoveMember = async () => {
    const email = window.prompt("Ingresa el CORREO ELECTRÓNICO del usuario que deseas remover:");
    if (!email) return;

    try {
      // 1. Obtenemos la organización para buscar el ID de ese correo
      const res = await apiClient.get(`/orgs/${orgId}`);
      const memberObj = res.data.members.find(m => m.userId?.email === email);

      if (!memberObj) {
        return alert("Ese usuario no es miembro de la organización o el correo es incorrecto.");
      }

      const targetUserId = memberObj.userId._id; // Extraemos el ID

      // 2. Ejecutamos el borrado con el ID
      if (window.confirm(`¿Estás seguro de que deseas remover a ${email}?`)) {
        await apiClient.delete(`/orgs/${orgId}/members/${targetUserId}`);
        alert("Miembro removido exitosamente.");
      }
    } catch (err) {
      alert("Error al remover: " + (err.response?.data?.error || err.message));
    }
  };

  // ✅ Función para ver quién está en la organización (Ahora con correos)
  const handleViewOrgMembers = async () => {
    try {
      const res = await apiClient.get(`/orgs/${orgId}`);
      const org = res.data;
      // Ahora leemos el email directamente
      const membersList = org.members.map(m => `👤 Correo: ${m.userId?.email || 'Desconocido'} - [Rol: ${m.role}]`).join('\n');
      alert(`MIEMBROS DE LA ORGANIZACIÓN:\n\n${membersList}`);
    } catch(err) {
      alert("Error al obtener los detalles de la organización.");
      console.error(err);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div>
          <button className="btn-primary btn-auto" onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem', backgroundColor: '#4b5563' }}>
            &larr; Volver al Panel
          </button>
          <h1>Proyectos del Espacio</h1>
        </div>
      </header>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Directorio de Proyectos</h2>
          
          {/* ✅ Agrupamos los botones */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary btn-auto" onClick={handleViewOrgMembers} style={{ backgroundColor: '#3b82f6' }}>
              👀 Ver Miembros
            </button>
            <button className="btn-primary btn-auto" onClick={handleEditOrg} style={{ backgroundColor: '#f59e0b' }}>
              ✏️ Editar Org
            </button>
            <button className="btn-primary btn-auto" onClick={handleDeleteOrg} style={{ backgroundColor: '#dc2626' }}>
              🗑️ Eliminar Org
            </button>
            <button className="btn-primary btn-auto" onClick={handleInviteMember} style={{ backgroundColor: '#059669' }}>
              + Invitar Miembro
            </button>
            <button className="btn-primary btn-auto" onClick={handleRemoveMember} style={{ backgroundColor: '#be123c' }}>
              - Remover Miembro
            </button>
            <button className="btn-primary btn-auto" onClick={() => setIsModalOpen(true)}>
              + Nuevo Proyecto
            </button>
          </div>
        </div>

        {isFetching ? (
          <div className="empty-state">Cargando proyectos...</div>
        ) : error ? (
          <div className="error-alert">{error}</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <p>No hay proyectos activos en esta organización.</p>
          </div>
        ) : (
          <div className="grid-container">
            {projects.map((proj) => (
              <div key={proj._id} className="card">
                <h3 className="card-title">{proj.name}</h3>
                {/* En frontend/src/views/OrganizationView.jsx */}
                <div className="card-body">
                  <div className="badge-container">
                    <span className={`badge-tag ${proj.visibility === 'private' ? 'badge-private' : 'badge-internal'}`}>
                      {proj.visibility}
                    </span>
                    <span className={`badge-tag ${proj.status === 'active' ? 'badge-active' : 'badge-archived'}`}>
                      {proj.status}
                    </span>
                  </div>
                </div>
                {/* En el futuro, este botón nos llevará al Kanban de tareas */}
                <button 
                    className="btn-primary" 
                    onClick={() => navigate(`/projects/${proj._id}`)}
                    >
                    Ver Tareas
                    </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {isModalOpen && (
        <ProjectModal 
            orgId={orgId}
            onClose={() => setIsModalOpen(false)} 
            onSuccess={fetchProjects} 
        />
        )}
    </div>
  );
};

export default OrganizationView;