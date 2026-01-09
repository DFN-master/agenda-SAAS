import React, { useEffect, useState } from 'react';

function EmailIntegration() {
  const [connections, setConnections] = useState([]);
  const [limits, setLimits] = useState({ max_email_connections: 0, current_email_connections: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', config: '{}' });

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const limitsRes = await fetch('http://localhost:3000/api/connections/plan-limits', { headers });
      const connRes = await fetch('http://localhost:3000/api/connections/my-connections', { headers });

      const limitsJson = limitsRes.ok ? await limitsRes.json() : {};
      const connJson = connRes.ok ? await connRes.json() : { data: [] };

      setLimits(limitsJson);
      setConnections((connJson.data || []).filter(c => c.type === 'email'));
    } catch (err) {
      console.error('Error loading email integrations:', err);
      setError('Erro ao carregar integrações de email');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      let res;
      if (editing) {
        res = await fetch(`http://localhost:3000/api/connections/${editing.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ name: formData.name, config: JSON.parse(formData.config) }),
        });
      } else {
        res = await fetch('http://localhost:3000/api/connections', {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: 'email', name: formData.name, config: JSON.parse(formData.config) }),
        });
      }

      if (res.ok) {
        setSuccess(editing ? 'Conta de email atualizada!' : 'Conta de email adicionada!');
        setShowForm(false);
        setEditing(null);
        setFormData({ name: '', config: '{}' });
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Falha ao salvar conta de email');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Falha ao salvar conta de email');
    }
  };

  const removeConnection = async (id) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`http://localhost:3000/api/connections/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setSuccess('Conta removida!');
        fetchData();
      } else {
        setError('Falha ao remover conta');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Falha ao remover conta');
    }
  };

  return (
    <div>
      <h1>Integração com Email</h1>
      <p>Gerencie suas contas de email conectadas.</p>

      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}

      <div style={{ margin: '12px 0' }}>
        <strong>Limite:</strong> {limits.current_email_connections || 0} / {limits.max_email_connections || 0}
      </div>

      {!showForm && (
        <button onClick={() => { setShowForm(true); setEditing(null); setFormData({ name: '', config: '{}' }); }}>
          + Adicionar Conta de Email
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <div>
            <label>Nome</label>
            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <label>Config (JSON)</label>
            <textarea rows={6} value={formData.config} onChange={e => setFormData({ ...formData, config: e.target.value })} required />
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="submit">{editing ? 'Salvar' : 'Adicionar'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Carregando contas...</p>
      ) : connections.length === 0 ? (
        <p>Nenhuma conta de email.</p>
      ) : (
        <table style={{ width: '100%', marginTop: 12 }}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {connections.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.status}</td>
                <td>
                  <button onClick={() => { setEditing(c); setShowForm(true); setFormData({ name: c.name, config: JSON.stringify(c.config, null, 2) }); }}>Editar</button>
                  <button onClick={() => removeConnection(c.id)}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EmailIntegration;