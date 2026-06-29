import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSecureSubmit } from '../hooks/useSecureSubmit';
import apiClient from '../api/axiosConfig';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const { execute, isLoading, error } = useSecureSubmit((data) =>
    apiClient.post('/auth/register', data)
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await execute(formData);
    
    if (result.success) {
      // Pasamos un estado oculto en la navegación
      navigate('/login', { state: { message: 'Cuenta creada exitosamente. Inicia sesión.' } });
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">Crear Cuenta en SecureCollab</h2>
      
      {error && <div className="error-alert">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Nombre Completo:</label>
          <input 
            type="text" 
            id="name"
            name="name" 
            className="form-input" 
            value={formData.name} 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Correo Electrónico:</label>
          <input 
            type="email" 
            id="email"
            name="email" 
            className="form-input" 
            value={formData.email} 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña:</label>
          <input 
            type="password" 
            id="password"
            name="password" 
            className="form-input" 
            value={formData.password} 
            onChange={handleChange} 
            required 
            minLength="8" 
          />
        </div>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Registrando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>
      
      <p className="auth-footer">
        ¿Ya tienes una cuenta? <Link to="/login" className="auth-link">Inicia sesión aquí</Link>
      </p>
    </div>
  );
};

export default Register;