import { useState } from 'react';
import { useSecureSubmit } from '../hooks/useSecureSubmit';
import apiClient from '../api/axiosConfig';

export const OrganizationModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const { execute, isLoading, error } = useSecureSubmit((data) => 
    apiClient.post('/orgs', data)
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
        <h3>Nueva Organización</h3>
        {error && <div className="error-alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre:</label>
            <input className="form-input" required onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Descripción:</label>
            <input className="form-input" onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={isLoading}>Crear</button>
            <button type="button" className="btn-danger" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};