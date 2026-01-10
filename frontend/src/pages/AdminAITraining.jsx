import React, { useState, useEffect } from 'react';
import './AdminAITraining.css';

function AdminAITraining({ companyId }) {
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStatus, setHistoryStatus] = useState('approved');
  const [editingId, setEditingId] = useState(null);
  const [editedResponse, setEditedResponse] = useState('');
  const [editedFeedback, setEditedFeedback] = useState('');
  const [autoRespondStatus, setAutoRespondStatus] = useState({
    auto_respond_enabled: false,
    ai_confidence_score: 0,
    ai_total_approvals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [resolvedCompanyId, setResolvedCompanyId] = useState(companyId || null);
  const [teachingModal, setTeachingModal] = useState({
    isOpen: false,
    query: '',
    explanation: '',
    examples: [],
    currentExample: '',
    intent: '',
  });
  const [teaching, setTeaching] = useState(false);
  const [vocabularyTab, setVocabularyTab] = useState('words');
  const [vocabulary, setVocabulary] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [vocabularyModal, setVocabularyModal] = useState({
    isOpen: false,
    word: '',
    definition: '',
    synonyms: [],
    currentSynonym: '',
    examples: [],
    currentExample: '',
    editingId: null,
  });
  const [addingVocabulary, setAddingVocabulary] = useState(false);
  const [seedingVocabulary, setSeedingVocabulary] = useState(false);

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
    fetchVocabulary(resolvedCompanyId);
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      fetchData(resolvedCompanyId);
      fetchVocabulary(resolvedCompanyId);
    }, 10000);
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
        const status = data.data || {};
        // Normaliza nomes vindos do backend
        setAutoRespondStatus({
          auto_respond_enabled: status.auto_respond_enabled ?? false,
          ai_confidence_score:
            status.ai_confidence_score ?? status.confidence_score ?? 0,
          ai_total_approvals:
            status.ai_total_approvals ?? status.total_approvals ?? 0,
        });
      }

      // Fetch history with current filter
      await fetchHistory(cid, historyStatus, false);

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

  const fetchHistory = async (cid, status = 'approved', showLoading = true) => {
    try {
      if (showLoading) setLoadingHistory(true);
      const res = await fetch(
        `http://localhost:3000/api/ai/suggestions/history?company_id=${cid}&status=${status}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setHistory(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditedResponse(item.approved_response || item.suggested_response || '');
    setEditedFeedback(item.feedback || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditedResponse('');
    setEditedFeedback('');
  };

  const saveEdit = async (item) => {
    try {
      setError('');
      setSuccess('');
      const res = await fetch(`http://localhost:3000/api/ai/suggestions/${item.id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: resolvedCompanyId,
          status: item.status,
          approved_response: editedResponse,
          feedback: editedFeedback,
        }),
      });

      if (res.ok) {
        setSuccess('Sugestão atualizada.');
        cancelEdit();
        await fetchHistory(resolvedCompanyId, historyStatus);
        await fetchData(resolvedCompanyId);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao atualizar sugestão');
      }
    } catch (err) {
      console.error('Error updating suggestion:', err);
      setError('Erro ao atualizar sugestão');
    }
  };

  const openTeachingModal = (suggestion) => {
    const intent = suggestion?.intent || 'geral';
    setTeachingModal({
      isOpen: true,
      query: suggestion?.incoming_message || '',
      explanation: '',
      examples: [],
      currentExample: '',
      intent: intent,
    });
  };

  const closeTeachingModal = () => {
    setTeachingModal({
      isOpen: false,
      query: '',
      explanation: '',
      examples: [],
      currentExample: '',
      intent: '',
    });
  };

  const addExample = () => {
    if (teachingModal.currentExample.trim()) {
      setTeachingModal({
        ...teachingModal,
        examples: [...teachingModal.examples, teachingModal.currentExample],
        currentExample: '',
      });
    }
  };

  const removeExample = (index) => {
    setTeachingModal({
      ...teachingModal,
      examples: teachingModal.examples.filter((_, i) => i !== index),
    });
  };

  const submitTeaching = async () => {
    if (!teachingModal.query.trim() || !teachingModal.explanation.trim()) {
      setError('Pergunta e explicação são obrigatórios');
      return;
    }

    try {
      setTeaching(true);
      setError('');
      setSuccess('');

      const res = await fetch('http://localhost:3000/api/ai/learning/teach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: resolvedCompanyId,
          original_query: teachingModal.query,
          explanation: teachingModal.explanation,
          intent: teachingModal.intent,
          examples: teachingModal.examples,
        }),
      });

      if (res.ok) {
        setSuccess('Conceito ensinado com sucesso! A IA aprendeu uma nova forma de responder.');
        closeTeachingModal();
        // Refresh data to show new learned concept
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchData(resolvedCompanyId);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao ensinar conceito');
      }
    } catch (err) {
      console.error('Error teaching concept:', err);
      setError('Erro ao ensinar conceito');
    } finally {
      setTeaching(false);
    }
  };

  // ==================== VOCABULARY FUNCTIONS ====================

  const fetchVocabulary = async (cid) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/ai/vocabulary?company_id=${cid}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setVocabulary(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching vocabulary:', err);
    }
  };

  const openVocabularyModal = (word = null) => {
    if (word) {
      setVocabularyModal({
        isOpen: true,
        word: word.word,
        definition: word.definition,
        synonyms: word.synonyms || [],
        currentSynonym: '',
        examples: word.examples || [],
        currentExample: '',
        editingId: word.id,
      });
    } else {
      setVocabularyModal({
        isOpen: true,
        word: '',
        definition: '',
        synonyms: [],
        currentSynonym: '',
        examples: [],
        currentExample: '',
        editingId: null,
      });
    }
  };

  const closeVocabularyModal = () => {
    setVocabularyModal({
      isOpen: false,
      word: '',
      definition: '',
      synonyms: [],
      currentSynonym: '',
      examples: [],
      currentExample: '',
      editingId: null,
    });
  };

  const addSynonym = () => {
    if (vocabularyModal.currentSynonym.trim()) {
      setVocabularyModal({
        ...vocabularyModal,
        synonyms: [...vocabularyModal.synonyms, vocabularyModal.currentSynonym.trim()],
        currentSynonym: '',
      });
    }
  };

  const removeSynonym = (index) => {
    setVocabularyModal({
      ...vocabularyModal,
      synonyms: vocabularyModal.synonyms.filter((_, i) => i !== index),
    });
  };

  const addVocabularyExample = () => {
    if (vocabularyModal.currentExample.trim()) {
      setVocabularyModal({
        ...vocabularyModal,
        examples: [...vocabularyModal.examples, vocabularyModal.currentExample.trim()],
        currentExample: '',
      });
    }
  };

  const removeVocabularyExample = (index) => {
    setVocabularyModal({
      ...vocabularyModal,
      examples: vocabularyModal.examples.filter((_, i) => i !== index),
    });
  };

  const saveVocabularyWord = async () => {
    if (!vocabularyModal.word.trim() || !vocabularyModal.definition.trim()) {
      setError('Palavra e definição são obrigatórios');
      return;
    }

    try {
      setAddingVocabulary(true);
      setError('');
      setSuccess('');

      const method = vocabularyModal.editingId ? 'PUT' : 'POST';
      const url = vocabularyModal.editingId
        ? `http://localhost:3000/api/ai/vocabulary/words/${vocabularyModal.editingId}`
        : 'http://localhost:3000/api/ai/vocabulary/words';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: resolvedCompanyId,
          word: vocabularyModal.word.trim(),
          definition: vocabularyModal.definition.trim(),
          synonyms: vocabularyModal.synonyms,
          examples: vocabularyModal.examples,
        }),
      });

      if (res.ok) {
        setSuccess(vocabularyModal.editingId ? 'Palavra atualizada!' : 'Palavra adicionada ao vocabulário!');
        closeVocabularyModal();
        await fetchVocabulary(resolvedCompanyId);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao salvar palavra');
      }
    } catch (err) {
      console.error('Error saving vocabulary word:', err);
      setError('Erro ao salvar palavra');
    } finally {
      setAddingVocabulary(false);
    }
  };

  const deleteVocabularyWord = async (wordId) => {
    if (!window.confirm('Tem certeza que deseja remover esta palavra?')) return;

    try {
      setError('');
      setSuccess('');

      const res = await fetch(
        `http://localhost:3000/api/ai/vocabulary/words/${wordId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (res.ok) {
        setSuccess('Palavra removida do vocabulário');
        await fetchVocabulary(resolvedCompanyId);
      } else {
        setError('Erro ao remover palavra');
      }
    } catch (err) {
      console.error('Error deleting vocabulary word:', err);
      setError('Erro ao remover palavra');
    }
  };

  const seedInitialVocabulary = async () => {
    if (!window.confirm('Isso irá carregar um dicionário inicial com 20+ palavras de negócio. Continuar?')) {
      return;
    }

    try {
      setSeedingVocabulary(true);
      setError('');
      setSuccess('');

      const res = await fetch(
        `http://localhost:3000/api/ai/vocabulary/seed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            company_id: resolvedCompanyId,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setSuccess(`✓ ${data.message} Sua IA agora tem uma base de conhecimento de ${data.data.total} palavras!`);
        await fetchVocabulary(resolvedCompanyId);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao carregar vocabulário');
      }
    } catch (err) {
      console.error('Error seeding vocabulary:', err);
      setError('Erro ao carregar vocabulário inicial');
    } finally {
      setSeedingVocabulary(false);
    }
  };

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
                    <strong>{suggestion.client_ref || 'Desconhecido'}</strong>
                    <span className="confidence-badge">
                      Conf: {((suggestion.confidence || 0) * 100).toFixed(0)}%
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

                      <button
                        className="btn-teach"
                        onClick={() => openTeachingModal(suggestion)}
                        title="Ensinar à IA como responder a este tipo de pergunta"
                      >
                        📚 Ensinar
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

      {/* Histórico */}
      <div className="history-section">
        <div className="history-header">
          <h3>Histórico de Decisões</h3>
          <div className="history-filters">
            <label>Status:</label>
            <select
              value={historyStatus}
              onChange={(e) => {
                const status = e.target.value;
                setHistoryStatus(status);
                fetchHistory(resolvedCompanyId, status);
              }}
            >
              <option value="approved">Aprovadas</option>
              <option value="rejected">Rejeitadas</option>
              <option value="auto_sent">Auto-enviadas</option>
              <option value="pending">Pendentes</option>
            </select>
            <button
              className="btn-refresh"
              onClick={() => fetchHistory(resolvedCompanyId, historyStatus)}
              disabled={loadingHistory}
            >
              {loadingHistory ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="no-suggestions">
            <p>Nenhuma entrada neste filtro.</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className={`history-card status-${item.status}`}>
                <div className="history-top">
                  <div>
                    <strong>{item.client_ref || 'Desconhecido'}</strong>
                    <span className="history-status">{item.status}</span>
                  </div>
                  <div className="history-time">
                    {new Date(item.updated_at || item.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="history-body">
                  <div className="history-field">
                    <span className="history-label">Recebida:</span>
                    <span>{item.incoming_message}</span>
                  </div>
                  <div className="history-field">
                    <span className="history-label">Sugestão:</span>
                    <span>{item.suggested_response}</span>
                  </div>
                  <div className="history-field">
                    <span className="history-label">Aprovada:</span>
                    {editingId === item.id && item.status === 'approved' ? (
                      <input
                        className="history-input"
                        value={editedResponse}
                        onChange={(e) => setEditedResponse(e.target.value)}
                      />
                    ) : (
                      <span>{item.approved_response || '—'}</span>
                    )}
                  </div>
                  <div className="history-field">
                    <span className="history-label">Feedback:</span>
                    {editingId === item.id && item.status === 'rejected' ? (
                      <input
                        className="history-input"
                        value={editedFeedback}
                        onChange={(e) => setEditedFeedback(e.target.value)}
                      />
                    ) : (
                      <span>{item.feedback || '—'}</span>
                    )}
                  </div>
                  {item.metadata?.last_decision && (
                    <div className="history-field meta">
                      <span className="history-label">Última decisão:</span>
                      <span>
                        {item.metadata.last_decision.type} em {new Date(item.metadata.last_decision.at).toLocaleString()}
                        {item.metadata.last_decision.feedback
                          ? ` • Feedback: ${item.metadata.last_decision.feedback}`
                          : ''}
                      </span>
                    </div>
                  )}
                  <div className="history-actions">
                    {editingId === item.id ? (
                      <>
                        <button className="btn-save" onClick={() => saveEdit(item)}>
                          Salvar
                        </button>
                        <button className="btn-cancel" onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn-edit"
                        onClick={() => startEdit(item)}
                        disabled={item.status === 'pending'}
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teaching Modal */}
      {teachingModal.isOpen && (
        <div className="modal-overlay" onClick={closeTeachingModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📚 Ensinar um novo conceito à IA</h3>
              <button className="modal-close" onClick={closeTeachingModal}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Pergunta/Query</label>
                <input
                  type="text"
                  value={teachingModal.query}
                  onChange={(e) =>
                    setTeachingModal({ ...teachingModal, query: e.target.value })
                  }
                  placeholder="Ex: Quais são os planos disponíveis?"
                  disabled={teaching}
                />
              </div>

              <div className="form-group">
                <label>Explicação (obrigatório)</label>
                <textarea
                  value={teachingModal.explanation}
                  onChange={(e) =>
                    setTeachingModal({ ...teachingModal, explanation: e.target.value })
                  }
                  placeholder="Como a IA deve responder a este tipo de pergunta?"
                  rows="4"
                  disabled={teaching}
                />
              </div>

              <div className="form-group">
                <label>Intenção</label>
                <select
                  value={teachingModal.intent}
                  onChange={(e) =>
                    setTeachingModal({ ...teachingModal, intent: e.target.value })
                  }
                  disabled={teaching}
                >
                  <option value="geral">Geral</option>
                  <option value="preço">Preço</option>
                  <option value="agendamento">Agendamento</option>
                  <option value="suporte">Suporte</option>
                  <option value="cancelamento">Cancelamento</option>
                  <option value="localização">Localização</option>
                </select>
              </div>

              <div className="form-group">
                <label>Exemplos de perguntas similares</label>
                <div className="examples-list">
                  {teachingModal.examples.map((ex, idx) => (
                    <div key={idx} className="example-item">
                      <span>{ex}</span>
                      <button
                        className="btn-remove"
                        onClick={() => removeExample(idx)}
                        disabled={teaching}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="example-input-group">
                  <input
                    type="text"
                    value={teachingModal.currentExample}
                    onChange={(e) =>
                      setTeachingModal({
                        ...teachingModal,
                        currentExample: e.target.value,
                      })
                    }
                    placeholder="Ex: Vocês têm planos compartilhados?"
                    disabled={teaching}
                    onKeyPress={(e) => e.key === 'Enter' && addExample()}
                  />
                  <button
                    className="btn-add-example"
                    onClick={addExample}
                    disabled={teaching || !teachingModal.currentExample.trim()}
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={closeTeachingModal}
                disabled={teaching}
              >
                Cancelar
              </button>
              <button
                className="btn-submit-teaching"
                onClick={submitTeaching}
                disabled={teaching || !teachingModal.query.trim() || !teachingModal.explanation.trim()}
              >
                {teaching ? '⏳ Ensinando...' : '✓ Ensinar à IA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vocabulary Section */}
      <div className="vocabulary-section">
        <div className="vocabulary-header">
          <h3>📖 Vocabulário e Conceitos</h3>
          <div className="vocabulary-buttons">
            <button
              className="btn-seed-vocabulary"
              onClick={seedInitialVocabulary}
              disabled={seedingVocabulary || vocabulary.length > 0}
              title="Carregar dicionário inicial com 20+ palavras de negócio"
            >
              {seedingVocabulary ? '⏳ Carregando...' : '🌱 Carregar Dicionário'}
            </button>
            <button
              className="btn-add-word"
              onClick={() => openVocabularyModal()}
              title="Adicionar nova palavra ao vocabulário para que a IA aprenda"
            >
              + Adicionar Palavra
            </button>
          </div>
        </div>

        {vocabulary.length === 0 ? (
          <div className="no-suggestions">
            <p>Nenhuma palavra no vocabulário. <strong>Clique em "🌱 Carregar Dicionário"</strong> para começar com uma base de conhecimento, ou adicione palavras manualmente para que a IA entenda melhor seus conceitos.</p>
          </div>
        ) : (
          <div className="vocabulary-list">
            {vocabulary.map((word) => (
              <div key={word.id} className="vocabulary-card">
                <div className="vocabulary-word-header">
                  <h4>{word.word}</h4>
                  <div className="vocabulary-actions">
                    <button
                      className="btn-edit"
                      onClick={() => openVocabularyModal(word)}
                      title="Editar palavra"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => deleteVocabularyWord(word.id)}
                      title="Remover palavra"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="vocabulary-definition">
                  <strong>Definição:</strong> {word.definition}
                </div>
                {word.synonyms && word.synonyms.length > 0 && (
                  <div className="vocabulary-synonyms">
                    <strong>Sinônimos:</strong> {word.synonyms.join(', ')}
                  </div>
                )}
                {word.examples && word.examples.length > 0 && (
                  <div className="vocabulary-examples">
                    <strong>Exemplos:</strong>
                    <ul>
                      {word.examples.map((ex, idx) => (
                        <li key={idx}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vocabulary Modal */}
      {vocabularyModal.isOpen && (
        <div className="modal-overlay" onClick={closeVocabularyModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{vocabularyModal.editingId ? '✏️ Editar Palavra' : '📝 Adicionar Palavra ao Vocabulário'}</h3>
              <button className="modal-close" onClick={closeVocabularyModal}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Palavra (obrigatório)</label>
                <input
                  type="text"
                  value={vocabularyModal.word}
                  onChange={(e) =>
                    setVocabularyModal({ ...vocabularyModal, word: e.target.value })
                  }
                  placeholder="Ex: Agendamento"
                  disabled={addingVocabulary || vocabularyModal.editingId}
                />
              </div>

              <div className="form-group">
                <label>Definição (obrigatório)</label>
                <textarea
                  value={vocabularyModal.definition}
                  onChange={(e) =>
                    setVocabularyModal({ ...vocabularyModal, definition: e.target.value })
                  }
                  placeholder="Explique o significado desta palavra para seu negócio..."
                  rows="3"
                  disabled={addingVocabulary}
                />
              </div>

              <div className="form-group">
                <label>Sinônimos</label>
                <div className="synonyms-list">
                  {vocabularyModal.synonyms.map((syn, idx) => (
                    <div key={idx} className="synonym-item">
                      <span>{syn}</span>
                      <button
                        className="btn-remove"
                        onClick={() => removeSynonym(idx)}
                        disabled={addingVocabulary}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="synonym-input-group">
                  <input
                    type="text"
                    value={vocabularyModal.currentSynonym}
                    onChange={(e) =>
                      setVocabularyModal({
                        ...vocabularyModal,
                        currentSynonym: e.target.value,
                      })
                    }
                    placeholder="Ex: Marcação, Reserva"
                    disabled={addingVocabulary}
                    onKeyPress={(e) => e.key === 'Enter' && addSynonym()}
                  />
                  <button
                    className="btn-add"
                    onClick={addSynonym}
                    disabled={addingVocabulary || !vocabularyModal.currentSynonym.trim()}
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Exemplos de Uso</label>
                <div className="examples-list">
                  {vocabularyModal.examples.map((ex, idx) => (
                    <div key={idx} className="example-item">
                      <span>{ex}</span>
                      <button
                        className="btn-remove"
                        onClick={() => removeVocabularyExample(idx)}
                        disabled={addingVocabulary}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="example-input-group">
                  <input
                    type="text"
                    value={vocabularyModal.currentExample}
                    onChange={(e) =>
                      setVocabularyModal({
                        ...vocabularyModal,
                        currentExample: e.target.value,
                      })
                    }
                    placeholder="Ex: Você pode agendar uma consulta conosco"
                    disabled={addingVocabulary}
                    onKeyPress={(e) => e.key === 'Enter' && addVocabularyExample()}
                  />
                  <button
                    className="btn-add"
                    onClick={addVocabularyExample}
                    disabled={addingVocabulary || !vocabularyModal.currentExample.trim()}
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={closeVocabularyModal}
                disabled={addingVocabulary}
              >
                Cancelar
              </button>
              <button
                className="btn-save"
                onClick={saveVocabularyWord}
                disabled={addingVocabulary || !vocabularyModal.word.trim() || !vocabularyModal.definition.trim()}
              >
                {addingVocabulary ? '⏳ Salvando...' : '✓ Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAITraining;
