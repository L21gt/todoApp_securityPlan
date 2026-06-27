import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useSecureSubmit } from '../hooks/useSecureSubmit';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const { execute, isLoading, error } = useSecureSubmit(async (data) => {
    await login(data.email, data.password);
    return { data: { success: true } };
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await execute(formData);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">Acceso a SecureCollab</h2>
      
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
      
      <p className="auth-footer">
        ¿No tienes cuenta? <Link to="/register" className="auth-link">Regístrate aquí</Link>
      </p>
    </div>
  );
};

export default Login;