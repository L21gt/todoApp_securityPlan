import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSecureSubmit } from '../hooks/useSecureSubmit';
import apiClient from '../api/axiosConfig';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';

const ProjectKanban = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Endpoint para listar tareas del proyecto (Ajusta la ruta si tu backend usa otra)
  const { execute, error } = useSecureSubmit(() => apiClient.get(`/tareas/project/${projectId}`));

  const fetchTasks = useCallback(async () => {
    const result = await execute();
    if (result.success) {
      setTasks(result.data);
    }
    setIsFetching(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, [fetchTasks]);

  // Agrupar tareas por estado (usamos un fallback a "To Do" si no tienen estado aún)
  const groupedTasks = {
    'To Do': tasks.filter(t => t.estado === 'To Do' || !t.estado), 
    'In Progress': tasks.filter(t => t.estado === 'In Progress'),
    'Review': tasks.filter(t => t.estado === 'Review'),
    'Done': tasks.filter(t => t.estado === 'Done')
  };

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div>
          <button 
            className="btn-primary btn-auto" 
            onClick={() => navigate(-1)} 
            style={{ marginBottom: '1rem', backgroundColor: '#4b5563' }}
          >
            &larr; Volver
          </button>
          <h1>Tablero de Tareas</h1>
        </div>
        <button className="btn-primary btn-auto" onClick={() => setIsTaskModalOpen(true)}>
        + Nueva Tarea
        </button>
      </header>

      {error && <div className="error-alert">{error}</div>}

      {isFetching ? (
        <div className="loader-container"><div className="loader">Cargando tareas...</div></div>
      ) : (
        <div className="kanban-board">
          {Object.entries(groupedTasks).map(([columnName, columnTasks]) => (
            <div key={columnName} className="kanban-column">
              <div className="kanban-column-header">
                <span>{columnName}</span>
                <span className="badge" style={{ marginBottom: 0 }}>{columnTasks.length}</span>
              </div>
              
              {columnTasks.map(task => (
                <div key={task._id} className="task-card" onClick={() => setSelectedTaskId(task._id)}>
                  {/* Cumplimiento de Rúbrica: Indicador visual de tarea sensible */}
                  {task.sensitive && (
                    <div className="sensitive-badge">
                      🔒 Información Sensible
                    </div>
                  )}
                  <h4 className="task-title">{task.title}</h4>
                </div>
              ))}
              
              {columnTasks.length === 0 && (
                <div style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', marginTop: '1rem' }}>
                  Sin tareas
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isTaskModalOpen && (
        <TaskModal 
            projectId={projectId}
            onClose={() => setIsTaskModalOpen(false)} 
            onSuccess={fetchTasks} 
        />
        )}

        {selectedTaskId && (
        <TaskDetailModal 
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)} 
            onSuccess={fetchTasks} 
        />
        )}
    </div>
  );
};

export default ProjectKanban;