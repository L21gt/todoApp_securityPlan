import { useState, useEffect, useCallback } from 'react';
import { useSecureSubmit } from '../hooks/useSecureSubmit';
import apiClient from '../api/axiosConfig';

export const TaskDetailModal = ({ taskId, onClose, onSuccess }) => {
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState('');

  const fetchTaskApi = useCallback(() => apiClient.get(`/tareas/${taskId}`), [taskId]);
  
  const { execute: fetchTask, isLoading } = useSecureSubmit(fetchTaskApi);
  
  const { execute: postComment } = useSecureSubmit((data) => 
  // Apuntamos a la raíz y enviamos el taskId en el objeto
  apiClient.post(`/comentarios`, { taskId: taskId, text: data.text })
);

  const loadTask = useCallback(async () => {
    const result = await fetchTask();
    if (result.success) setTask(result.data);
  }, [fetchTask]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTask();
  }, [loadTask]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      alert("Por favor, escribe un comentario antes de enviar.");
      return; 
    }

    const res = await postComment({ text: comment });
    
    // ✅ FIX: Manejo explícito del error
    if (res.success) {
      setComment('');
      await loadTask();
      if (onSuccess) onSuccess(); 
      onClose();
    } else {
      // Si el backend responde 403 (Privilege Escalation), aquí lo atrapamos
      const errorMessage = res.error || "No tienes permisos para realizar esta acción.";
      alert(errorMessage); 
    }
  };

  const handleDeleteTask = async () => {
    if (window.confirm("¿Deseas eliminar esta tarea?")) {
      try {
        await apiClient.delete(`/tareas/${taskId}`);
        onSuccess(); // Recarga las tareas
        onClose(); // Cierra el modal
      } catch (err) {
        console.error("Error al eliminar la tarea:", err);
        alert("No tienes permisos para borrar esta tarea.");
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content-wide">
        {isLoading ? <p>Cargando...</p> : task ? (
          <>
            {task.sensitive && <div className="sensitive-badge">🔒 Información Sensible</div>}
            <h2>{task.title}</h2>
            <p>{task.description}</p>
            

            <div className="form-group">
                <label>Estado:</label>
                <select 
                    className="form-input" 
                    value={task.estado || 'To Do'}
                    onChange={async (e) => {
                      const newEstado = e.target.value;
                      const res = await apiClient.put(`/tareas/${taskId}`, { estado: newEstado });
                      if (res.status === 200) {
                          setTask({ ...task, estado: newEstado });
                          if (onSuccess) onSuccess();
                          onClose();
                      }
                    }}
                >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                </select>
            </div>

            <div className="comment-section">
              <h4>Comentarios</h4>
              <ul className="comment-list" style={{ paddingLeft: 0, listStyle: 'none' }}>
                {task.comentarios?.filter(c => c.text || c.body).map((c, i) => (
                  <li key={i} className="comment-item" style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                    
                    {/* Nombre del Autor en negrita */}
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#374151' }}>
                      {c.authorId?.name || c.authorId?.email || c.userName || 'Usuario desconocido'}
                    </div>
                    
                    {/* Texto del comentario en su propia línea */}
                    <p style={{ margin: '0.25rem 0 0 0', color: '#111827' }}>
                      {c.body || c.text}
                    </p>
                    
                  </li>
                ))}
              </ul>
              <form onSubmit={handleAddComment}>
                <input 
                  className="form-input" 
                  placeholder="Escribe un comentario..." 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)} 
                />
                <button type="submit" className="btn-primary comment-submit-btn">Enviar</button>
              </form>
            </div>

          
            <button className="btn-danger modal-close-btn" onClick={onClose}>Cerrar</button>

            <button onClick={handleDeleteTask} style={{ backgroundColor: '#dc2626', color: 'white', padding: '0.5rem', borderRadius: '4px', marginTop: '1rem' }}>🗑️ Eliminar Tarea</button>
          </>
        ) : <p>Error al cargar la tarea.</p>}
      </div>
    </div>
  );
};