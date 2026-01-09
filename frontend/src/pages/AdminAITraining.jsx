import React, { useState, useEffect } from 'react';
import './AdminAITraining.css';

function AdminAITraining({ companyId }) {
  const [suggestions, setSuggestions] = useState([]);
  const [autoRespondStatus, setAutoRespondStatus] = useState({
    auto_respond_enabled: false,
    ai_confidence_score: 0,
    ai_total_approvals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [resolvedCompanyId, setResolvedCompanyId] = useState(companyId || null);

  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    // Resolve companyId if not provided via prop
    const ensureCompanyId = async () => {
      try {
        if (!resolvedCompanyId && currentUser?.id) {
          const res = await fetch(`http://localhost:3000/api/users/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const cid = data?.Companies?.[0]?.id;
            if (cid) setResolvedCompanyId(cid);
          }
        }
      } catch {
        // ignore resolve errors; UI will show error if fetches fail later
      }
    };

    ensureCompanyId();
  }, [resolvedCompanyId, currentUser?.id, token]);

  useEffect(() => {
    if (!resolvedCompanyId) return;
    fetchData(resolvedCompanyId);
    // Refresh every 10 seconds
    const interval = setInterval(() => fetchData(resolvedCompanyId), 10000);
    return () => clearInterval(interval);
  }, [resolvedCompanyId]);

  const fetchData = async (cid) => {
    try {
      setError('');
      
      // Fetch pending suggestions
      const sugRes = await fetch(
        `http://localhost:3000/api/ai/suggestions?company_id=${cid}&limit=50`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (sugRes.ok) {
        const data = await sugRes.json();
        setSuggestions(data.data || []);
      }

      // Fetch auto-respond status
      const statusRes = await fetch(
        `http://localhost:3000/api/ai/auto-respond/status?company_id=${cid}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (statusRes.ok) {
        const data = await statusRes.json();
        setAutoRespondStatus(data.data || {});
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching AI training data:', err);
      setError('Erro ao carregar dados de treinamento');
      setLoading(false);
    }
  };

  const handleApproveSuggestion = async (suggestionId, approvedResponse) => {
    try {
      setApproving(suggestionId);
      setError('');
      setSuccess('');

      const res = await fetch(
        `http://localhost:3000/api/ai/suggestions/${suggestionId}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            company_id: resolvedCompanyId,
            approved_response: approvedResponse,
          }),
        }
      );

      if (res.ok) {
        setSuccess('Sugestão aprovada! Confiança aumentada.');
        setSelectedSuggestion(null);
        await fetchData(resolvedCompanyId);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao aprovar sugestão');
      }
    } catch (err) {
      console.error('Error approving suggestion:', err);
      setError('Erro ao aprovar sugestão');
    } finally {
      setApproving(null);
    }
  };

  const handleRejectSuggestion = async (suggestionId) => {
    try {
      setRejecting(suggestionId);
      setError('');
      setSuccess('');

      const res = await fetch(
        `http://localhost:3000/api/ai/suggestions/${suggestionId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            company_id: resolvedCompanyId,
            feedback: rejectFeedback,
          }),
        }
      );

      if (res.ok) {
        setSuccess('Sugestão rejeitada.');
        setSelectedSuggestion(null);
        setRejectFeedback('');
        await fetchData(resolvedCompanyId);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao rejeitar sugestão');
      }
    } catch (err) {
      console.error('Error rejecting suggestion:', err);
      setError('Erro ao rejeitar sugestão');
    } finally {
      setRejecting(null);
    }
  };

  const handleToggleAutoRespond = async () => {
    try {
      setError('');
      setSuccess('');

      const res = await fetch('http://localhost:3000/api/ai/auto-respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: resolvedCompanyId,
          enabled: !autoRespondStatus.auto_respond_enabled,
        }),
      });

      if (res.ok) {
        setSuccess(
          autoRespondStatus.auto_respond_enabled
            ? 'Auto-resposta desativada.'
            : 'Auto-resposta ativada!'
        );
        await fetchData(resolvedCompanyId);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao atualizar auto-resposta');
      }
    } catch (err) {
      console.error('Error toggling auto-respond:', err);
      setError('Erro ao atualizar auto-resposta');
    }
  };

  const confidencePercentage = Math.round(
    (autoRespondStatus.ai_confidence_score / 0.95) * 100
  );

  if (!resolvedCompanyId) {
    return <div className="ai-training-container"><p>Carregando contexto da empresa...</p></div>;
  }

  if (loading) {
    return <div className="ai-training-container"><p>Carregando...</p></div>;
  }

  return (
    <div className="ai-training-container">
      <div className="ai-header">
        <h2>🤖 Treinamento de IA</h2>
        <p>Aprove ou rejeite sugestões para treinar o sistema</p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {/* Status & Control Panel */}
      <div className="status-panel">
        <div className="status-card">
          <div className="status-label">Total de Aprovações</div>
          <div className="status-value">{autoRespondStatus.ai_total_approvals || 0}</div>
        </div>

        <div className="status-card">
          <div className="status-label">Nível de Confiança</div>
          <div className="status-value">
            {(autoRespondStatus.ai_confidence_score * 100).toFixed(1)}%
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${confidencePercentage}%` }}
            />
          </div>
        </div>

        <div className="status-card auto-respond-card">
          <div className="status-label">Auto-Resposta</div>
          <button
            className={`toggle-button ${
              autoRespondStatus.auto_respond_enabled ? 'enabled' : 'disabled'
            }`}
            onClick={handleToggleAutoRespond}
          >
            {autoRespondStatus.auto_respond_enabled ? '✓ Ativada' : '○ Desativada'}
          </button>
          {autoRespondStatus.auto_respond_enabled && (
            <p className="auto-respond-info">
              ⚡ Mensagens serão respondidas automaticamente quando confiança &gt; 70%
            </p>
          )}
        </div>
      </div>

      {/* Pending Suggestions */}
      <div className="suggestions-section">
        <h3>Sugestões Pendentes ({suggestions.length})</h3>

        {suggestions.length === 0 ? (
          <div className="no-suggestions">
            <p>✓ Nenhuma sugestão pendente. Sistema está atualizado!</p>
          </div>
        ) : (
          <div className="suggestions-list">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`suggestion-card ${
                  selectedSuggestion?.id === suggestion.id ? 'expanded' : ''
                }`}
              >
                <div
                  className="suggestion-header"
                  onClick={() =>
                    setSelectedSuggestion(
                      selectedSuggestion?.id === suggestion.id ? null : suggestion
                    )
                  }
                >
                  <div className="suggestion-client">
                    <strong>{suggestion.UserConnection?.client_ref || 'Desconhecido'}</strong>
                    <span className="confidence-badge">
                      Conf: {(suggestion.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="suggestion-time">
                    {new Date(suggestion.created_at).toLocaleTimeString()}
                  </div>
                </div>

                {selectedSuggestion?.id === suggestion.id && (
                  <div className="suggestion-details">
                    <div className="message-section">
                      <h4>📩 Mensagem Recebida</h4>
                      <div className="message-box">
                        {suggestion.incoming_message}
                      </div>
                    </div>

                    <div className="message-section">
                      <h4>💬 Sugestão de Resposta</h4>
                      <div className="message-box suggestion-box">
                        {suggestion.suggested_response}
                      </div>
                    </div>

                    {suggestion.conversation_context && (
                      <div className="message-section">
                        <h4>📋 Contexto da Conversa</h4>
                        <div className="context-box">
                          {suggestion.conversation_context
                            .split('\n')
                            .map((line, idx) => (
                              <div key={idx} className="context-line">
                                {line}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="action-section">
                      <button
                        className="btn-approve"
                        onClick={() =>
                          handleApproveSuggestion(
                            suggestion.id,
                            suggestion.suggested_response
                          )
                        }
                        disabled={approving === suggestion.id}
                      >
                        {approving === suggestion.id ? '⏳ Aprovando...' : '✓ Aprovar'}
                      </button>

                      <div className="reject-group">
                        <input
                          type="text"
                          className="feedback-input"
                          placeholder="Feedback (opcional)"
                          value={
                            selectedSuggestion?.id === suggestion.id
                              ? rejectFeedback
                              : ''
                          }
                          onChange={(e) => setRejectFeedback(e.target.value)}
                        />
                        <button
                          className="btn-reject"
                          onClick={() => handleRejectSuggestion(suggestion.id)}
                          disabled={rejecting === suggestion.id}
                        >
                          {rejecting === suggestion.id ? '⏳ Rejeitando...' : '✗ Rejeitar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAITraining;
