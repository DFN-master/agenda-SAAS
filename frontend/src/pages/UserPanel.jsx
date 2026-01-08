import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import WhatsAppIntegration from '../components/Integrations/WhatsAppIntegration';
import EmailIntegration from '../components/Integrations/EmailIntegration';
import Plans from '../components/Plans';
import Reports from '../components/Reports';
import Settings from '../components/Settings';
import Workflow from '../components/Workflow/Workflow';
import AdminIntegrations from '../components/Integrations/AdminIntegrations';

function UserPanel() {
  return (
    <Router>
      <div className="user-panel">
        <nav>
          <ul>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/integrations/whatsapp">WhatsApp</Link></li>
            <li><Link to="/integrations/email">Email</Link></li>
            <li><Link to="/plans">Planos</Link></li>
            <li><Link to="/reports">Relatórios</Link></li>
            <li><Link to="/workflow">Workflow</Link></li>
            <li><Link to="/settings">Configurações</Link></li>
            <li><Link to="/integrations/admin">Gerenciar Conexões</Link></li>
          </ul>
        </nav>
        <main>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/integrations/whatsapp" element={<WhatsAppIntegration />} />
            <Route path="/integrations/email" element={<EmailIntegration />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/workflow" element={<Workflow />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/integrations/admin" element={<AdminIntegrations />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default UserPanel;