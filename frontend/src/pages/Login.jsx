import React, { useState } from 'react';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('superadmin@example.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // TODO: Add API call for authentication
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: data.id,
        email: data.email,
        role: data.role,
      }));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#gradient)" />
              <path
                d="M10 14H22M10 18H22M10 10H22M8 22H24C25.1046 22 26 21.1046 26 20V10C26 8.89543 25.1046 8 24 8H8C6.89543 8 6 8.89543 6 10V20C6 21.1046 6.89543 22 8 22Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>Agenda-Sys</h1>
          <p>Sistema de Gestão de Agendamentos</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <p>Problemas para entrar? <a href="#">Recuperar acesso</a></p>
        </div>
      </div>

      <div className="login-info">
        <h2>Bem-vindo ao Agenda-Sys</h2>
        <p>Gerencie seus agendamentos de forma simples e eficiente</p>
        <ul>
          <li>✓ Agendamentos simplificados</li>
          <li>✓ Integração com Email e WhatsApp</li>
          <li>✓ Relatórios detalhados</li>
          <li>✓ Gestão de usuários e permissões</li>
        </ul>
      </div>
    </div>
  );
}

export default Login;