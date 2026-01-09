import React, { useState, useEffect } from 'react';
import './Reports.css';

function Reports() {
  const [summary, setSummary] = useState(null);
  const [periodData, setPeriodData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [selectedPeriod]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      const summaryRes = await fetch('http://localhost:3000/api/reports/summary');
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      const periodRes = await fetch(`http://localhost:3000/api/reports/by-period?period=${selectedPeriod}`);
      if (periodRes.ok) {
        const data = await periodRes.json();
        setPeriodData(data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Relatórios</h1>
          <p>Visualize estatísticas e métricas de desempenho</p>
        </div>
      </div>

      <div className="period-selector">
        <label>Período:</label>
        <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
          <option value="day">Hoje</option>
          <option value="week">Esta Semana</option>
          <option value="month">Este Mês</option>
          <option value="year">Este Ano</option>
        </select>
      </div>

      {loading ? (
        <p>Carregando relatórios...</p>
      ) : (
        <>
          {summary && (
            <div className="summary-grid">
              <div className="summary-card">
                <h4>Total de Agendamentos</h4>
                <p className="summary-value">{summary.totalAppointments}</p>
              </div>
              <div className="summary-card">
                <h4>Agendamentos Concluídos</h4>
                <p className="summary-value success">{summary.completedAppointments}</p>
              </div>
              <div className="summary-card">
                <h4>Agendamentos Cancelados</h4>
                <p className="summary-value danger">{summary.canceledAppointments}</p>
              </div>
              <div className="summary-card">
                <h4>Agendamentos Pendentes</h4>
                <p className="summary-value warning">{summary.pendingAppointments}</p>
              </div>
              <div className="summary-card">
                <h4>Emails Enviados</h4>
                <p className="summary-value">{summary.emailsSent}</p>
              </div>
              <div className="summary-card">
                <h4>Mensagens WhatsApp</h4>
                <p className="summary-value">{summary.whatsappMessages}</p>
              </div>
              <div className="summary-card">
                <h4>Clientes Alcançados</h4>
                <p className="summary-value">{summary.clientsReached}</p>
              </div>
              <div className="summary-card">
                <h4>Tempo Médio de Resposta</h4>
                <p className="summary-value">{summary.averageResponseTime}</p>
              </div>
            </div>
          )}

          {periodData && (
            <div className="period-data">
              <h2>Dados por {periodData.period === 'day' ? 'Dia' : 'Período'}</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Agendamentos</th>
                    <th>Emails</th>
                    <th>WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  {periodData.data.map((row, idx) => (
                    <tr key={idx}>
                      <td>{new Date(row.date).toLocaleDateString('pt-BR')}</td>
                      <td>{row.appointments}</td>
                      <td>{row.emails}</td>
                      <td>{row.messages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Reports;
