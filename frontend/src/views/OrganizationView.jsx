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

  // Endpoint: GET /api/orgs/:orgId/projects
  const { execute, error } = useSecureSubmit(() => apiClient.get(`/orgs/${orgId}/projects`));

  const fetchProjects = useCallback(async () => {
    const result = await execute();
    if (result.success) {
      setProjects(result.data);
    }
    setIsFetching(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [fetchProjects]);

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
          <button className="btn-primary btn-auto" onClick={() => setIsModalOpen(true)}>
            + Nuevo Proyecto
            </button>
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
                <div className="card-body">
                  Visibilidad: {proj.visibility} <br />
                  Estado: {proj.status}
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