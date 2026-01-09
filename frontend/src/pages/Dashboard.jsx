import React, { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get user data from localStorage
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      window.location.href = '/';
      return;
    }

    try {
      const user = JSON.parse(userData);
      setUser(user);
      fetchDashboardData();
    } catch (err) {
      console.error('Error parsing user data:', err);
      window.location.href = '/';
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch stats
      const statsRes = await fetch('http://localhost:3000/api/dashboard/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch users
      const usersRes = await fetch('http://localhost:3000/api/users?limit=5');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data || []);
      }

      // Fetch companies
      const companiesRes = await fetch('http://localhost:3000/api/companies?limit=5');
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData.data || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1>Bem-vindo, {user?.email?.split('@')[0]?.toUpperCase()}!</h1>
        <p>Gerencie seus agendamentos de forma simples e eficiente</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {stats && (
        <div className="dashboard-grid">
            <div className="card">
              <div className="card-icon calendar">📅</div>
              <h3>Agendamentos Hoje</h3>
              <p className="card-number">{stats.todayAppointments}</p>
              <p className="card-subtitle">Próximos compromissos</p>
            </div>

            <div className="card">
              <div className="card-icon users">👥</div>
              <h3>Clientes</h3>
              <p className="card-number">{stats.totalClients}</p>
              <p className="card-subtitle">Total cadastrados</p>
            </div>

            <div className="card">
              <div className="card-icon email">✉️</div>
              <h3>Usuários</h3>
              <p className="card-number">{stats.totalUsers}</p>
              <p className="card-subtitle">Total de usuários</p>
            </div>

            <div className="card">
              <div className="card-icon whatsapp">💬</div>
              <h3>Mensagens WhatsApp</h3>
              <p className="card-number">{stats.whatsappMessages}</p>
              <p className="card-subtitle">Este mês</p>
            </div>
          </div>
        )}

        <div className="dashboard-sections">
          <div className="section">
            <h2>Usuários Recentes</h2>
            {users.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Papel</th>
                    <th>Data de Criação</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge badge-${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="table-placeholder">
                <p>Nenhum usuário encontrado</p>
              </div>
            )}
          </div>

          <div className="section">
            <h2>Empresas Cadastradas</h2>
            {companies.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Plano</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td>{company.name}</td>
                      <td>{company.email}</td>
                      <td>{company.Plan?.name || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="table-placeholder">
                <p>Nenhuma empresa cadastrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
}

export default Dashboard;
