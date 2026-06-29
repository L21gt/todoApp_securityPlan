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

  // ✅ FIX: Memorizamos la función API para estabilizar su referencia en memoria
  const fetchProjectTasksApi = useCallback(() => apiClient.get(`/tareas/project/${projectId}`), [projectId]);
  const { execute, error } = useSecureSubmit(fetchProjectTasksApi);

  const fetchTasks = useCallback(async () => {
    const result = await execute();
    if (result.success) {
      setTasks(result.data);
    }
    setIsFetching(false);
  }, [execute]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, [fetchTasks]);

  // ✅ Función para la demo: Agregar miembros al proyecto con selección de ROL
  const handleInviteToProject = async () => {
    const email = window.prompt("Ingresa el correo del usuario a invitar al proyecto:");
    if (!email) return;
    
    // ✅ AQUÍ ESTÁ LA MAGIA: Preguntamos qué rol queremos darle
    const roleInput = window.prompt("Ingresa el rol (escribe 'developer' o 'viewer'):", "viewer");
    // Validamos que solo pueda ser uno de esos dos
    const role = roleInput === 'developer' ? 'developer' : 'viewer';

    try {
      await apiClient.post(`/projects/${projectId}/members`, { email, role });
      alert(`¡Usuario ${email} agregado exitosamente como ${role.toUpperCase()}!`);
    } catch (err) {
      alert("Error al agregar: " + (err.response?.data?.error || err.message));
    }
  };

  // ✅ Función rápida para editar nombre del proyecto
  const handleEditProject = async () => {
    const newName = window.prompt("Ingresa el nuevo nombre para el proyecto:");
    if (!newName) return;

    try {
      await apiClient.put(`/projects/${projectId}`, { name: newName });
      alert("Proyecto actualizado. Recarga la página para ver los cambios.");
    } catch (err) {
      alert("No tienes permisos para editar o hubo un error: " + (err.response?.data?.error || err.message));
    }
  };

  // ✅ Función para eliminar el proyecto
  const handleDeleteProject = async () => {
    if (window.confirm("🚨 ¿ESTÁS SEGURO? Esta acción eliminará el proyecto y todas sus tareas. Es irreversible.")) {
      try {
        await apiClient.delete(`/projects/${projectId}`);
        alert("Proyecto eliminado exitosamente.");
        navigate(-1); // Regresamos a la organización
      } catch (err) {
        alert("No tienes permisos para eliminar: " + (err.response?.data?.error || err.message));
      }
    }
  };

  // ✅ Función principal del Drag & Drop
  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    if (!taskId) return;

    // Actualización optimista: Movemos la tarjeta visualmente al instante para que se sienta rápido
    setTasks(prevTasks => prevTasks.map(t => t._id === taskId ? { ...t, estado: newStatus } : t));

    try {
      // Hacemos la petición por detrás
      await apiClient.put(`/tareas/${taskId}`, { estado: newStatus });
    } catch (error) {
      console.error("Error al mover la tarea:", error);
      alert("No tienes permisos para mover esta tarea o hubo un error.");
      fetchTasks(); // Si falla (ej. error 403 de ABAC), revertimos al estado real de la BD
    }
  };

  // ✅ Función para ver los miembros y sus roles
  const handleViewMembers = async () => {
    try {
      const res = await apiClient.get(`/projects/${projectId}/members`);
      const membersList = res.data.map(m => `👤 ${m.userId?.email || 'Usuario Desconocido'} - [Rol: ${m.role}]`).join('\n');
      alert(`MIEMBROS DEL PROYECTO:\n\n${membersList}`);
    } catch(err) {
      alert("Error al obtener los miembros.");
      console.error(err);
    }
  }

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
        
        {/* ✅ Agrupamos los botones */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Nuevos botones de gestión */}
          <button className="btn-primary btn-auto" onClick={handleViewMembers} style={{ backgroundColor: '#3b82f6' }}>
            👀 Ver Miembros
          </button>
          <button className="btn-primary btn-auto" onClick={handleEditProject} style={{ backgroundColor: '#f59e0b' }}>
            ✏️ Editar Proyecto
          </button>
          <button className="btn-primary btn-auto" onClick={handleDeleteProject} style={{ backgroundColor: '#dc2626' }}>
            🗑️ Eliminar Proyecto
          </button>
          
          <button className="btn-primary btn-auto" onClick={handleInviteToProject} style={{ backgroundColor: '#059669' }}>
            + Invitar al Proyecto
          </button>
          <button className="btn-primary btn-auto" onClick={() => setIsTaskModalOpen(true)}>
            + Nueva Tarea
          </button>
        </div>
      </header>

      {error && <div className="error-alert">{error}</div>}

      {isFetching ? (
        <div className="loader-container"><div className="loader">Cargando tareas...</div></div>
      ) : (
        <div className="kanban-board">
          {Object.entries(groupedTasks).map(([columnName, columnTasks]) => (
            <div 
              key={columnName} 
              className="kanban-column"
              // ✅ Eventos para que la columna acepte que le suelten cosas
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, columnName)}
            >
              <div className="kanban-column-header">
                <span>{columnName}</span>
                <span className="badge" style={{ marginBottom: 0 }}>{columnTasks.length}</span>
              </div>
              
              {columnTasks.map(task => (
                <div 
                  key={task._id} 
                  className="task-card" 
                  onClick={() => setSelectedTaskId(task._id)}
                  // ✅ Eventos para que la tarjeta se pueda arrastrar
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('taskId', task._id)}
                >
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
                  Suelta una tarea aquí
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