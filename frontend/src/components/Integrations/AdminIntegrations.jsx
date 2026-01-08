import React, { useState } from 'react';

function AdminIntegrations() {
  const [connections, setConnections] = useState([]);

  const handleAddConnection = (type) => {
    // TODO: Implement logic to add a new connection
    console.log(`Adding new ${type} connection`);
  };

  return (
    <div>
      <h1>Gerenciar Conexões</h1>
      <p>Adicione e gerencie conexões de WhatsApp, Email e outras integrações.</p>

      <div>
        <button onClick={() => handleAddConnection('WhatsApp')}>Adicionar Conexão WhatsApp</button>
        <button onClick={() => handleAddConnection('Email')}>Adicionar Conexão Email</button>
        {/* Add buttons for other integrations */}
      </div>

      <div>
        <h2>Conexões Atuais</h2>
        {connections.length === 0 ? (
          <p>Nenhuma conexão adicionada.</p>
        ) : (
          <ul>
            {connections.map((connection, index) => (
              <li key={index}>{connection.type} - {connection.details}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AdminIntegrations;