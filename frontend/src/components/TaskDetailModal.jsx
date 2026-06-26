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
    if (res.success) {
      setComment('');
      await loadTask();
      if (onSuccess) onSuccess(); 
      onClose();
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
              <ul className="comment-list">
                {task.comentarios?.filter(c => c.text || c.body).map((c, i) => (
                  <li key={i} className="comment-item">
                    <small>{c.authorId?.name || c.userName || 'Usuario desconocido'}</small>
                    {c.text || c.body}
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
          </>
        ) : <p>Error al cargar la tarea.</p>}
      </div>
    </div>
  );
};