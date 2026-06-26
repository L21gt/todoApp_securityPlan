import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useSecureSubmit } from '../hooks/useSecureSubmit';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Envolvemos la función login del contexto dentro de nuestro hook para aprovechar
  // la sanitización de DOMPurify y la extracción de errores de Axios.
  const { execute, isLoading, error } = useSecureSubmit(async (data) => {
    await login(data.email, data.password);
    return { data: { success: true } }; // Retorno dummy para cumplir con la estructura del hook
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await execute(formData);
    
    // Si no hubo errores, los tokens ya están en memoria gracias al AuthContext
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--border-radius)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Acceso a SecureCollab</h2>
      
      {error && <div className="error-alert">{error}</div>}
      
      <form onSubmit={handleSubmit}>
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
          />
        </div>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Verificando...' : 'Ingresar'}
        </button>
      </form>
      
      <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        ¿No tienes cuenta? <Link to="/register" style={{ color: 'var(--primary-color)' }}>Regístrate aquí</Link>
      </p>
    </div>
  );
};

export default Login;