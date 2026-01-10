import React, { useState, useEffect } from 'react';
import './Integrations.css';

function Integrations() {
  const [connections, setConnections] = useState([]);
  const [planLimits, setPlanLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState('email');
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCodeData, setQrCodeData] = useState(null);
  const [scanningConnectionId, setScanningConnectionId] = useState(null);
  const [qrCheckInterval, setQrCheckInterval] = useState(null);
  const [reconnectingId, setReconnectingId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);

  const connectionTypes = [
    { id: 'email', name: 'Email (IMAP)', icon: '✉️' },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  // Polling para QR code quando está escaneando
  useEffect(() => {
    if (scanningConnectionId) {
      const interval = setInterval(() => {
        pollQRCode(scanningConnectionId);
      }, 1000); // Check a cada 1 segundo para detecção mais rápida
      setQrCheckInterval(interval);
      return () => clearInterval(interval);
    }
  }, [scanningConnectionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch connections
      const connRes = await fetch('http://localhost:3000/api/connections/my-connections', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (connRes.ok) {
        const connData = await connRes.json();
        setConnections(connData.data || []);
      }

      // Fetch plan limits
      const limitsRes = await fetch('http://localhost:3000/api/connections/plan-limits', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (limitsRes.ok) {
        const limitsData = await limitsRes.json();
        setPlanLimits(limitsData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erro ao carregar dados de conexões');
    } finally {
      setLoading(false);
    }
  };

  const startWhatsAppAuth = async () => {
    try {
      setError('');
      setSuccess('');

      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
      const token = localStorage.getItem('token');
      const companyId = user.Companies?.[0]?.id;

      if (!companyId) {
        setError('Erro: Usuário não está associado a uma empresa');
        return;
      }

      // Criar conexão no microservice WhatsApp
      const response = await fetch('http://localhost:4000/whatsapp/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          phoneNumber: formData.phone_number || '',
          companyId, // Para webhook da IA
          userToken: token, // Para autenticação no backend
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScanningConnectionId(data.connectionId);
        setQrCodeData(null);
        setSuccess('QR Code gerado! Escaneie com seu WhatsApp');
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao gerar QR Code');
      }
    } catch (err) {
      console.error('Error starting WhatsApp auth:', err);
      setError('Erro ao iniciar autenticação WhatsApp');
    }
  };

  const startWhatsAppReconnect = async (connectionId) => {
    try {
      setError('');
      setSuccess('');
      setReconnectingId(connectionId);

      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
      const token = localStorage.getItem('token');
      const companyId = user.Companies?.[0]?.id;

      if (!companyId) {
        setError('Erro: Usuário não está associado a uma empresa');
        return;
      }

      // Criar nova conexão no microservice WhatsApp
      const response = await fetch('http://localhost:4000/whatsapp/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          phoneNumber: '',
          companyId,
          userToken: token,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScanningConnectionId(data.connectionId);
        setQrCodeData(null);
        setSuccess('QR Code gerado! Escaneie com seu WhatsApp');
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao gerar QR Code');
      }
    } catch (err) {
      console.error('Error reconnecting WhatsApp:', err);
      setError('Erro ao reconectar WhatsApp');
    }
  };

  const handleDisconnectWhatsApp = async (connectionId) => {
    if (!window.confirm('Desconectar este WhatsApp? Você poderá reconectar depois.')) return;

    try {
      setError('');
      setSuccess('');
      setDisconnectingId(connectionId);
      console.log(`[DISCONNECT] Desconectando ${connectionId}...`);
      
      // Chamar microservice para desconectar
      const response = await fetch(`http://localhost:4000/whatsapp/connections/${connectionId}`, {
        method: 'DELETE',
      });

      console.log(`[DISCONNECT] Response status: ${response.status}`);

      if (response.ok) {
        console.log('[DISCONNECT] Desconexão bem-sucedida, atualizando UI...');
        setSuccess('WhatsApp desconectado! Atualizando...');
        
        // Aguardar um pouco e depois recarregar dados
        setTimeout(async () => {
          await fetchData();
          setSuccess('WhatsApp desconectado com sucesso!');
          setDisconnectingId(null);
        }, 500);
      } else {
        const errorText = await response.text();
        console.error('[DISCONNECT] Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.error || 'Erro ao desconectar WhatsApp');
        } catch {
          setError(`Erro ao desconectar WhatsApp (${response.status})`);
        }
        setDisconnectingId(null);
      }
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      setError(`Erro ao desconectar WhatsApp: ${err.message}`);
      setDisconnectingId(null);
    }
  };

  const pollQRCode = async (connectionId) => {
    try {
      const response = await fetch(`http://localhost:4000/whatsapp/connections/${connectionId}/qr`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        console.log(`[POLLING] Status: ${data.status}, ConnectionId: ${connectionId}`);
        
        // Mostrar QR code se disponível
        if (data.qrCode && data.status === 'scanning') {
          setQrCodeData(data.qrCode);
        }

        // Se conectado, parar polling e salvar
        if (data.status === 'connected') {
          console.log(`✅ [POLLING] WhatsApp CONECTADO! Salvando conexão...`);
          setScanningConnectionId(null);
          setSuccess('WhatsApp conectado com sucesso! Salvando...');
          // Salvar conexão no backend
          await saveWhatsAppConnection(connectionId, data);
        }
      } else if (response.status === 202) {
        // Ainda gerando QR code
        console.log('[POLLING] QR code não está pronto ainda');
      } else if (response.status === 404) {
        setScanningConnectionId(null);
        setError('Conexão expirou');
      }
    } catch (err) {
      console.error('Error polling QR code:', err);
    }
  };

  const saveWhatsAppConnection = async (connectionId, qrData) => {
    try {
      const payload = {
        type: 'whatsapp',
        name: formData.name || `WhatsApp - ${new Date().toLocaleDateString()}`,
        config: {
          connectionId,
          status: qrData.status,
          phoneNumber: formData.phone_number || '',
        },
        // Adicionar dados do WhatsApp se disponíveis
        whatsapp_number: qrData.userPhone,
        whatsapp_name: qrData.userName,
        whatsapp_status: qrData.userStatus,
        whatsapp_avatar_url: qrData.userProfilePic,
      };

      console.log('[SAVE] Salvando conexão:', payload);

      const response = await fetch('http://localhost:3000/api/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('✅ Conexão salva com sucesso no backend!');
        setFormData({});
        setShowAddForm(false);
        setQrCodeData(null);
        setScanningConnectionId(null);
        setReconnectingId(null);
        setSuccess('Conexão WhatsApp salva com sucesso!');
        await fetchData();
      } else {
        const errorData = await response.json();
        console.error('Erro ao salvar:', errorData);
        setError(errorData.error || 'Erro ao salvar conexão');
      }
    } catch (err) {
      console.error('Error saving WhatsApp connection:', err);
      setError('Erro ao salvar conexão: ' + err.message);
    }
  };

  const handleAddConnection = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      // Para WhatsApp, usar fluxo de QR Code
      if (selectedType === 'whatsapp') {
        await startWhatsAppAuth();
        return;
      }

      const requiredFields = {
        email: ['email', 'imap_host', 'imap_port'],
      };

      const fields = requiredFields[selectedType] || [];
      for (const field of fields) {
        if (!formData[field]) {
          setError(`Campo ${field} é obrigatório`);
          return;
        }
      }

      const isEditing = !!editingId;
      const url = isEditing
        ? `http://localhost:3000/api/connections/${editingId}`
        : 'http://localhost:3000/api/connections';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = isEditing
        ? {
            name: formData.name || `${selectedType} - ${new Date().toLocaleDateString()}`,
            config: formData,
          }
        : {
            type: selectedType,
            name: formData.name || `${selectedType} - ${new Date().toLocaleDateString()}`,
            config: formData,
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess(isEditing ? 'Conexão atualizada com sucesso!' : `Conexão ${selectedType} adicionada com sucesso!`);
        setFormData({});
        setShowAddForm(false);
        setEditingId(null);
        await fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao adicionar conexão');
      }
    } catch (err) {
      console.error('Error adding connection:', err);
      setError('Erro ao adicionar conexão');
    }
  };

  const handleDeleteConnection = async (connectionId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta conexão?')) return;

    try {
      setError('');
      const response = await fetch(`http://localhost:3000/api/connections/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setSuccess('Conexão deletada com sucesso!');
        await fetchData();
      } else {
        setError('Erro ao deletar conexão');
      }
    } catch (err) {
      console.error('Error deleting connection:', err);
      setError('Erro ao deletar conexão');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({});
    setScanningConnectionId(null);
    setQrCodeData(null);
    setReconnectingId(null);
    if (qrCheckInterval) clearInterval(qrCheckInterval);
  };

  const getConnectionTypeInfo = (type) => {
    return connectionTypes.find(t => t.id === type);
  };

  const canAddConnection = (type) => {
    if (!planLimits) return false;
    const current = connections.filter(c => c.type === type).length;
    const max = type === 'email' ? planLimits.max_email_connections : planLimits.max_whatsapp_connections;
    return current < max;
  };

  const renderFormFields = () => {
    switch (selectedType) {
      case 'email':
        return (
          <>
            <div className="form-group">
              <label>Nome da Conexão</label>
              <input
                type="text"
                placeholder="Meu Email Gmail"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Host IMAP</label>
              <input
                type="text"
                placeholder="imap.gmail.com"
                value={formData.imap_host || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, imap_host: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Porta IMAP</label>
              <input
                type="number"
                placeholder="993"
                defaultValue="993"
                value={formData.imap_port || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, imap_port: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                placeholder="Sua senha"
                value={formData.password || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </>
        );
      case 'whatsapp':
        return (
          <>
            <div className="form-group">
              <label>Nome da Conexão</label>
              <input
                type="text"
                placeholder="Meu WhatsApp Business"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            {scanningConnectionId ? (
              <div className="qr-container">
                <div className="qr-placeholder">
                  {qrCodeData ? (
                    <div>
                      <p>Escaneie o código QR com seu WhatsApp:</p>
                      <img src={qrCodeData} alt="QR Code" style={{ maxWidth: '300px' }} />
                    </div>
                  ) : (
                    <div className="loading-spinner">
                      <p>Gerando QR Code...</p>
                      <div className="spinner"></div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Número de Telefone (opcional)</label>
                <input
                  type="tel"
                  placeholder="+55 (11) 99999-9999"
                  value={formData.phone_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                />
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Integrações</h1>
        </div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Integrações</h1>
        <p>Conecte suas contas de email e WhatsApp</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!showAddForm && (
        <div className="connection-types">
          {connectionTypes.map((type) => {
            const count = connections.filter(c => c.type === type.id).length;
            const limit = type.id === 'email' ? planLimits?.max_email_connections : planLimits?.max_whatsapp_connections;
            const canAdd = canAddConnection(type.id);

            return (
              <div key={type.id} className="type-card">
                <h3>{type.icon} {type.name}</h3>
                <p className="connection-count">{count} de {limit} conexões</p>
                <button
                  className={`btn-add-type ${!canAdd ? 'disabled' : ''}`}
                  onClick={() => {
                    setSelectedType(type.id);
                    setShowAddForm(true);
                    setFormData({});
                    setEditingId(null);
                  }}
                  disabled={!canAdd}
                >
                  {canAdd ? '+ Adicionar' : 'Limite atingido'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showAddForm && (
        <div className="form-card">
          <h2>{selectedType === 'email' ? '✉️ Nova Conexão Email' : '💬 Nova Conexão WhatsApp'}</h2>
          <form onSubmit={handleAddConnection}>
            {renderFormFields()}
            <div className="form-actions">
              <button type="submit" className="btn-success">
                {scanningConnectionId ? 'Aguardando autenticação...' : 'Conectar'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="connections-section">
        <h2>Suas Conexões</h2>
        {connections.length === 0 ? (
          <p className="no-connections">Nenhuma conexão configurada</p>
        ) : (
          <div className="connections-grid">
            {connections.map((conn) => {
              const typeInfo = getConnectionTypeInfo(conn.type);
              const isReconnecting = reconnectingId === conn.id;
              
              return (
                <div key={conn.id} className="connection-card">
                  <div className="card-header">
                    <h4>{typeInfo?.icon} {conn.name}</h4>
                    <span className="type-badge">{conn.type}</span>
                  </div>
                  <div className="card-body">
                    {isReconnecting && (
                      <div className="qr-container">
                        <div className="qr-placeholder">
                          {qrCodeData ? (
                            <div>
                              <p>Escaneie o código QR com seu WhatsApp:</p>
                              <img src={qrCodeData} alt="QR Code" style={{ maxWidth: '300px' }} />
                            </div>
                          ) : (
                            <div className="loading-spinner">
                              <p>Gerando QR Code...</p>
                              <div className="spinner"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!isReconnecting && conn.type === 'email' ? (
                      <>
                        <p><strong>Email:</strong> {conn.config?.email}</p>
                        <p><strong>Host:</strong> {conn.config?.imap_host}</p>
                      </>
                    ) : !isReconnecting && conn.type === 'whatsapp' ? (
                      <>
                        {conn.whatsapp_avatar_url && (
                          <div className="whatsapp-avatar">
                            <img src={conn.whatsapp_avatar_url} alt="Avatar" />
                          </div>
                        )}
                        <p><strong>Número:</strong> {conn.whatsapp_number || 'N/A'}</p>
                        <p><strong>Nome:</strong> {conn.whatsapp_name || conn.name}</p>
                        {conn.whatsapp_status && (
                          <p><strong>Status:</strong> <span className="status-text">{conn.whatsapp_status}</span></p>
                        )}
                        <p><strong>Conectado em:</strong> {new Date(conn.created_at).toLocaleDateString('pt-BR')}</p>
                      </>
                    ) : (
                      !isReconnecting && <p><strong>Status:</strong> Conectado</p>
                    )}
                    <p><small>{new Date(conn.created_at).toLocaleDateString()}</small></p>
                  </div>
                  <div className="card-actions">
                    {isReconnecting ? (
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setReconnectingId(null);
                          setScanningConnectionId(null);
                          setQrCodeData(null);
                        }}
                      >
                        Cancelar
                      </button>
                    ) : conn.type === 'whatsapp' ? (
                      <>
                        {conn.whatsapp_number ? (
                          <button
                            className="btn-warning"
                            onClick={() => handleDisconnectWhatsApp(conn.config?.connectionId || conn.id)}
                            disabled={disconnectingId === (conn.config?.connectionId || conn.id)}
                          >
                            {disconnectingId === (conn.config?.connectionId || conn.id) ? '⏳ Desconectando...' : '⛔ Desconectar'}
                          </button>
                        ) : (
                          <button
                            className="btn-primary"
                            onClick={() => startWhatsAppReconnect(conn.id)}
                          >
                            🔗 Conectar
                          </button>
                        )}
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteConnection(conn.id)}
                        >
                          🗑️ Deletar
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteConnection(conn.id)}
                      >
                        🗑️ Deletar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Integrations;
