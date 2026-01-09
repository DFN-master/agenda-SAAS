import React, { useState, useEffect } from 'react';
import './Appointments.css';

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    client_email: '',
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/appointments');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ title: '', description: '', scheduled_at: '', client_email: '' });
        setShowForm(false);
        await fetchAppointments();
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Agendamentos</h1>
          <p>Gerencie todos os seus agendamentos</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Novo Agendamento'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>Novo Agendamento</h2>
          <form onSubmit={handleSubmit} className="appointment-form">
            <div className="form-row">
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Ex: Reunião com cliente"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email do Cliente *</label>
                <input
                  type="email"
                  name="client_email"
                  value={formData.client_email}
                  onChange={handleFormChange}
                  placeholder="cliente@example.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Detalhes do agendamento"
                rows="4"
              ></textarea>
            </div>

            <div className="form-group">
              <label>Data e Hora *</label>
              <input
                type="datetime-local"
                name="scheduled_at"
                value={formData.scheduled_at}
                onChange={handleFormChange}
                required
              />
            </div>

            <button type="submit" className="btn-success">Criar Agendamento</button>
          </form>
        </div>
      )}

      <div className="appointments-grid">
        {loading ? (
          <p>Carregando...</p>
        ) : appointments.length > 0 ? (
          appointments.map(apt => (
            <div key={apt.id} className="appointment-card">
              <div className="apt-header">
                <h3>{apt.title}</h3>
                <span className={`status-badge status-${apt.status}`}>{apt.status}</span>
              </div>
              <p className="apt-description">{apt.description}</p>
              <div className="apt-details">
                <div>
                  <strong>Cliente:</strong>
                  <p>{apt.client_email}</p>
                </div>
                <div>
                  <strong>Data/Hora:</strong>
                  <p>{new Date(apt.scheduled_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">Nenhum agendamento encontrado</p>
        )}
      </div>
    </div>
  );
}

export default Appointments;
