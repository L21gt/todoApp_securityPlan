import { useState } from 'react';
import { useSecureSubmit } from '../hooks/useSecureSubmit';
import apiClient from '../api/axiosConfig';

export const TaskModal = ({ onClose, onSuccess, projectId }) => {
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    sensitive: false,
    completed: false
  });

  // Apuntamos al endpoint POST que vimos en tu backend
  const { execute, isLoading, error } = useSecureSubmit((data) => 
    apiClient.post(`/tareas/project/${projectId}`, data)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await execute(formData);
    if (result.success) {
      onSuccess(); // Recargar el tablero Kanban
      onClose();   // Cerrar el modal
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Nueva Tarea</h3>
        {error && <div className="error-alert">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título de la Tarea:</label>
            <input 
              className="form-input" 
              required 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})} 
            />
          </div>
          
          <div className="form-group">
            <label>Descripción:</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          {/* CHECKBOX DE SEGURIDAD ABAC (Requerido por Rúbrica) */}
          <div className="form-group" style={{ 
            backgroundColor: '#fffbeb', 
            padding: '1rem', 
            borderRadius: '8px', 
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <input 
              type="checkbox" 
              id="sensitive-check"
              checked={formData.sensitive}
              onChange={(e) => setFormData({...formData, sensitive: e.target.checked})}
              style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
            />
            <label htmlFor="sensitive-check" style={{ cursor: 'pointer', margin: 0, fontWeight: 'bold', color: '#b45309' }}>
              Marcar como Información Sensible
            </label>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={isLoading}>
              Guardar Tarea
            </button>
            <button type="button" className="btn-danger" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};