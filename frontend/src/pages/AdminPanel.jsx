import React, { useState, useEffect } from 'react';
import AdminAITraining from './AdminAITraining';
import './AdminPanel.css';

function AdminPanel() {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  const isCompanyAdmin = user.role === 'admin';
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'companies' : 'ai-training');

  // Gate de acesso: permitir super_admin e admin de empresa, redirecionar demais usuários
  useEffect(() => {
    if (!(isSuperAdmin || isCompanyAdmin)) {
      window.location.href = '/dashboard';
    }
  }, [isSuperAdmin, isCompanyAdmin]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Carregar planos sempre que estiver na aba de empresas (para o dropdown)
  useEffect(() => {
    if (activeTab === 'companies') {
      fetchPlans();
    }
  }, [activeTab]);

  const fetchPlans = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/plans?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };


  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      if (activeTab === 'companies') {
        const res = await fetch('http://localhost:3000/api/companies?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.data || []);
        }
      } else if (activeTab === 'plans') {
        const res = await fetch('http://localhost:3000/api/plans?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPlans(data.data || []);
        }
      } else if (activeTab === 'users') {
        const res = await fetch('http://localhost:3000/api/users?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      const url = editingId
        ? `http://localhost:3000/api/companies/${editingId}`
        : 'http://localhost:3000/api/companies';

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const resp = await response.json();
        let msg = editingId ? 'Empresa atualizada com sucesso!' : 'Empresa criada com sucesso!';
        if (!editingId && resp.admin_initial_password && resp.admin_user?.email) {
          msg += ` Usuário admin criado: ${resp.admin_user.email} (senha temporária: ${resp.admin_initial_password}).`;
        }
        setSuccess(msg);
        setFormData({});
        setShowForm(false);
        setEditingId(null);
        await fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao salvar empresa');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Erro ao salvar empresa');
    }
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      const url = editingId
        ? `http://localhost:3000/api/plans/${editingId}`
        : 'http://localhost:3000/api/plans';

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(editingId ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!');
        setFormData({});
        setShowForm(false);
        setEditingId(null);
        await fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao salvar plano');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Erro ao salvar plano');
    }
  };

  const handleDelete = async (id, resource) => {
    if (!window.confirm(`Tem certeza que deseja deletar este ${resource}?`)) return;

    try {
      setError('');
      const response = await fetch(`http://localhost:3000/api/${resource}s/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess(`${resource} deletado com sucesso!`);
        await fetchData();
      } else {
        setError(`Erro ao deletar ${resource}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(`Erro ao deletar ${resource}`);
    }
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({});
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>{isSuperAdmin ? 'Painel de Super Admin' : 'Painel do Admin da Empresa'}</h1>
        <p>{isSuperAdmin ? 'Gerencie empresas, planos e usuários do sistema' : 'Gerencie o treinamento de IA da sua empresa'}</p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="admin-tabs">
        {isSuperAdmin && (
          <>
            <button
              className={`tab-button ${activeTab === 'companies' ? 'active' : ''}`}
              onClick={() => setActiveTab('companies')}
            >
              🏢 Empresas
            </button>
            <button
              className={`tab-button ${activeTab === 'plans' ? 'active' : ''}`}
              onClick={() => setActiveTab('plans')}
            >
              💳 Planos
            </button>
            <button
              className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 Usuários
            </button>
          </>
        )}
        <button
          className={`tab-button ${activeTab === 'ai-training' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-training')}
        >
          🤖 Treinamento IA
        </button>
      </div>

      <div className="admin-content">
        {/* Empresas Tab */}
        {activeTab === 'companies' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>Gerenciamento de Empresas</h2>
              {!showForm && (
                <button
                  className="btn-add"
                  onClick={() => {
                    setFormData({});
                    setEditingId(null);
                    setShowForm(true);
                  }}
                >
                  + Nova Empresa
                </button>
              )}
            </div>

            {showForm && (
              <div className="form-container">
                <h3>{editingId ? 'Editar Empresa' : 'Nova Empresa'}</h3>
                <form onSubmit={handleAddCompany}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome da Empresa</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Plano</label>
                      <select
                        value={formData.plan_id || ''}
                        onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                        required
                      >
                        <option value="">Selecione um plano</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Telefone (opcional)</label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-success">
                      {editingId ? 'Atualizar' : 'Criar'} Empresa
                    </button>
                    <button type="button" className="btn-secondary" onClick={handleCancel}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <p>Carregando empresas...</p>
            ) : companies.length === 0 ? (
              <p className="no-data">Nenhuma empresa cadastrada</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Plano</th>
                      <th>Telefone</th>
                      <th>Data de Criação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id}>
                        <td>{company.name}</td>
                        <td>{company.email}</td>
                        <td>{company.Plan?.name || 'N/A'}</td>
                        <td>{company.phone || '-'}</td>
                        <td>{new Date(company.created_at).toLocaleDateString()}</td>
                        <td className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(company)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(company.id, 'company')}
                          >
                            Deletar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Planos Tab */}
        {activeTab === 'plans' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>Gerenciamento de Planos</h2>
              {!showForm && (
                <button
                  className="btn-add"
                  onClick={() => {
                    setFormData({});
                    setEditingId(null);
                    setShowForm(true);
                  }}
                >
                  + Novo Plano
                </button>
              )}
            </div>

            {showForm && (
              <div className="form-container">
                <h3>{editingId ? 'Editar Plano' : 'Novo Plano'}</h3>
                <form onSubmit={handleAddPlan}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome do Plano</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Preço (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price || ''}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Máx. Conexões Email</label>
                      <input
                        type="number"
                        value={formData.max_email_connections || ''}
                        onChange={(e) => setFormData({ ...formData, max_email_connections: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Máx. Números WhatsApp</label>
                      <input
                        type="number"
                        value={formData.max_whatsapp_numbers || ''}
                        onChange={(e) => setFormData({ ...formData, max_whatsapp_numbers: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-success">
                      {editingId ? 'Atualizar' : 'Criar'} Plano
                    </button>
                    <button type="button" className="btn-secondary" onClick={handleCancel}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <p>Carregando planos...</p>
            ) : plans.length === 0 ? (
              <p className="no-data">Nenhum plano cadastrado</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Preço (R$)</th>
                      <th>Conexões Email</th>
                      <th>Números WhatsApp</th>
                      <th>Data de Criação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr key={plan.id}>
                        <td>{plan.name}</td>
                        <td>R$ {parseFloat(plan.price).toFixed(2)}</td>
                        <td>{plan.max_email_connections}</td>
                        <td>{plan.max_whatsapp_numbers}</td>
                        <td>{new Date(plan.created_at).toLocaleDateString()}</td>
                        <td className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(plan)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(plan.id, 'plan')}
                          >
                            Deletar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Usuários Tab */}
        {activeTab === 'users' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>Gerenciamento de Usuários</h2>
              {!showForm && (
                <button
                  className="btn-add"
                  onClick={() => {
                    setFormData({});
                    setEditingId(null);
                    setShowForm(true);
                    // Precarregar empresas para seleção
                    fetch('http://localhost:3000/api/companies?limit=100', {
                      headers: { 'Authorization': `Bearer ${token}` },
                    })
                      .then(r => r.ok ? r.json() : { data: [] })
                      .then(d => setCompanies(d.data || []))
                      .catch(() => {});
                  }}
                >
                  + Novo Usuário
                </button>
              )}
            </div>

            {showForm && (
              <div className="form-container">
                <h3>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setError('');
                    setSuccess('');
                    const url = editingId
                      ? `http://localhost:3000/api/users/${editingId}`
                      : 'http://localhost:3000/api/users';
                    const method = editingId ? 'PUT' : 'POST';
                    const body = { ...formData };
                    if (!editingId && !body.password) {
                      setError('Senha é obrigatória para novo usuário');
                      return;
                    }
                    const response = await fetch(url, {
                      method,
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify(body),
                    });
                    if (response.ok) {
                      const data = await response.json();
                      setSuccess(editingId ? 'Usuário atualizado!' : 'Usuário criado!');
                      setFormData({});
                      setEditingId(null);
                      setShowForm(false);
                      await fetchData();
                    } else {
                      const data = await response.json();
                      setError(data.error || 'Falha ao salvar usuário');
                    }
                  } catch (err) {
                    setError('Falha ao salvar usuário');
                  }
                }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Papel</label>
                      <select
                        value={formData.role || 'user'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        required
                      >
                        <option value="user">Usuário</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Senha {editingId ? '(opcional)' : '(obrigatória)'}
                      </label>
                      <input
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingId}
                      />
                    </div>
                    <div className="form-group">
                      <label>Empresa (opcional)</label>
                      <select
                        value={formData.company_id || ''}
                        onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                      >
                        <option value="">Sem empresa</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-success">
                      {editingId ? 'Salvar' : 'Criar Usuário'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={handleCancel}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <p>Carregando usuários...</p>
            ) : users.length === 0 ? (
              <p className="no-data">Nenhum usuário cadastrado</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Papel</th>
                      <th>Empresa</th>
                      <th>Data de Criação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge badge-${u.role}`}>
                            {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Usuário'}
                          </span>
                        </td>
                        <td>{u.Companies?.[0]?.name || '-'}</td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => {
                              setFormData({ email: u.email, role: u.role, company_id: u.Companies?.[0]?.id || '' });
                              setEditingId(u.id);
                              setShowForm(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(u.id, 'user')}
                          >
                            Deletar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Training Tab */}
      {activeTab === 'ai-training' && (
        <div className="tab-content">
          <AdminAITraining companyId={user.Companies?.[0]?.id} />
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
