import { useState } from 'react';
import { useSecureSubmit } from '../hooks/useSecureSubmit';
import apiClient from '../api/axiosConfig';

export const ProjectModal = ({ onClose, onSuccess, orgId }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    visibility: 'internal'
    // Eliminamos orgId de aquí, ya no viajará en el body
  });

  // Hacemos el POST al nuevo endpoint inyectando el orgId en la URL
  const { execute, isLoading, error } = useSecureSubmit((data) => 
    apiClient.post(`/orgs/${orgId}/projects`, data)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await execute(formData);
    if (result.success) {
      onSuccess(); 
      onClose();   
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Nuevo Proyecto</h3>
        {error && <div className="error-alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre del Proyecto:</label>
            <input 
              className="form-input" 
              required 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          
          <div className="form-group">
            <label>Descripción:</label>
            <input 
              className="form-input" 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <div className="form-group">
            <label>Visibilidad:</label>
            <select 
              className="form-input" 
              value={formData.visibility}
              onChange={(e) => setFormData({...formData, visibility: e.target.value})}
            >
              <option value="internal">Interno (Visible para la org)</option>
              <option value="private">Privado (Solo invitados)</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={isLoading}>
              Crear Proyecto
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