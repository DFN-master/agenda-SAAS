import React, { useState, useEffect } from 'react';
import './WhatsAppQRModal.css';

/**
 * Modal para exibir QR code do WhatsApp
 * Permite autenticação de nova conexão escaneando código
 */
function WhatsAppQRModal({ isOpen, onClose, onSuccess }) {
  const [qrCode, setQrCode] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('waiting'); // waiting, authenticated
  const [polling, setPolling] = useState(false);

  const token = localStorage.getItem('token');

  /**
   * Inicia novo fluxo de conexão
   */
  const initializeConnection = async () => {
    try {
      setLoading(true);
      setError('');
      setStatus('waiting');

      // Obter dados do usuário do localStorage
      const userJson = localStorage.getItem('user');
      if (!userJson) {
        setError('⚠️ Não autenticado. Faça login primeiro para conectar WhatsApp.');
        setLoading(false);
        return;
      }

      const user = JSON.parse(userJson);
      const userId = user.id;
      
      // Obter primeira empresa do usuário
      const companies = user.Companies || [];
      if (companies.length === 0) {
        setError('⚠️ Nenhuma empresa associada à sua conta. Contate o administrador.');
        setLoading(false);
        return;
      }

      const companyId = companies[0].id;

      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // POST para /api/whatsapp/connect com company_id e user_id
      const res = await fetch('http://localhost:3000/api/whatsapp/connect', {
        method: 'POST',
        headers,
        body: JSON.stringify({ company_id: companyId, user_id: userId }),
      });

      if (res.ok) {
        const data = await res.json();
        setConnectionId(data.connection_id);
        setQrCode(data.qr_code);
        setPolling(true);
      } else {
        let errorMsg = 'Falha ao iniciar conexão';
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // Se não conseguir fazer parse de JSON, usa mensagem genérica
          errorMsg = `Erro ${res.status}: ${res.statusText}`;
        }
        setError(errorMsg);
        console.error('[QR Modal] Connection error:', errorMsg);
      }
    } catch (err) {
      console.error('Initialize connection error:', err);
      setError('Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Poll status a cada 2 segundos
   */
  useEffect(() => {
    if (!polling || !connectionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const userJson = localStorage.getItem('user');
        if (!userJson) return;
        
        const user = JSON.parse(userJson);
        const companies = user.Companies || [];
        const companyId = companies.length > 0 ? companies[0].id : '';
        
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(
          `http://localhost:3000/api/whatsapp/qr?connection_id=${connectionId}&company_id=${companyId}`,
          { headers }
        );

        if (res.ok) {
          const data = await res.json();
          
          if (data.status === 'authenticated') {
            setStatus('authenticated');
            setPolling(false);
            setQrCode(null);
            
            // Sucesso! Chamar callback
            if (onSuccess) onSuccess(connectionId);
            
            // Auto-fechar após 2 segundos
            setTimeout(() => onClose(), 2000);
          } else {
            // Update QR code if renewed
            if (data.qr_code && data.qr_code !== qrCode) {
              setQrCode(data.qr_code);
            }
          }
        }
      } catch (err) {
        console.error('Poll status error:', err);
        // Continua tentando
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [polling, connectionId, qrCode, onSuccess, onClose, token]);

  const handleClose = () => {
    setPolling(false);
    setQrCode(null);
    setConnectionId(null);
    setStatus('waiting');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="whatsapp-qr-overlay">
      <div className="whatsapp-qr-modal">
        <button className="close-btn" onClick={handleClose}>×</button>
        
        <h2>Conectar WhatsApp</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        {!qrCode && status === 'waiting' && (
          <div className="init-section">
            <p>Clique no botão abaixo para gerar um QR code</p>
            <button 
              className="btn-primary"
              onClick={initializeConnection}
              disabled={loading}
            >
              {loading ? 'Gerando...' : 'Gerar QR Code'}
            </button>
          </div>
        )}
        
        {qrCode && status === 'waiting' && (
          <div className="qr-section">
            <p>Escaneie o código QR com seu WhatsApp:</p>
            <img src={qrCode} alt="QR Code" className="qr-image" />
            <p className="instruction">
              1. Abra WhatsApp no seu telefone<br />
              2. Escaneie este código com a câmera<br />
              3. Confirme a autenticação
            </p>
            <p className="loading">Aguardando autenticação...</p>
          </div>
        )}
        
        {status === 'authenticated' && (
          <div className="success-section">
            <div className="success-icon">✓</div>
            <p>WhatsApp conectado com sucesso!</p>
            <p className="connection-id">ID: {connectionId}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatsAppQRModal;
