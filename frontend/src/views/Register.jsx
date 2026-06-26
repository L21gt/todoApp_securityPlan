import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSecureSubmit } from '../hooks/useSecureSubmit';
import apiClient from '../api/axiosConfig';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  // Conectamos nuestra API con el Hook de seguridad para sanitizar inputs y manejar errores
  const { execute, isLoading, error } = useSecureSubmit((data) =>
    apiClient.post('/auth/register', data)
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await execute(formData);
    
    // Si la petición sanitizada fue exitosa, enviamos al usuario al login
    if (result.success) {
      navigate('/login');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--border-radius)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Crear Cuenta en SecureCollab</h2>
      
      {/* Alerta de Error (401, 409, 422, 429) mapeada por el hook */}
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
      
      <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        ¿Ya tienes una cuenta? <Link to="/login" style={{ color: 'var(--primary-color)' }}>Inicia sesión aquí</Link>
      </p>
    </div>
  );
};

export default Register;