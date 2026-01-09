import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Navbar.css';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/appointments', label: 'Agendamentos' },
    { path: '/reports', label: 'Relatórios' },
    { path: '/integrations', label: 'Integrações' },
  ];

  // Adicionar link de Admin para super_admin e admin de empresa
  if (user?.role === 'super_admin' || user?.role === 'admin') {
    navLinks.push({ path: '/admin', label: '⚙️ Admin' });
  }

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
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
          <span>Agenda-Sys</span>
        </div>

        <div className="navbar-menu">
          {navLinks.map(link => (
            <a
              key={link.path}
              href={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="navbar-user">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
