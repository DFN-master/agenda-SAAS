import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
    await queryInterface.createTable('appointments', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      client_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nome do cliente para quem será o agendamento',
      },
      appointment_date: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Data do agendamento (ex: segunda feira, dia 15, amanhã)',
      },
      appointment_date_normalized: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data normalizada para o banco (calculada pela IA ou admin)',
      },
      appointment_time: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Hora do agendamento (ex: 9:00, 14:30)',
      },
      service_description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descrição do serviço a ser prestado',
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Status do agendamento',
      },
      extraction_confidence: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Confiança da extração de dados (0-100)',
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'Usuário que criou o agendamento',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas adicionais sobre o agendamento',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Criar índices para melhor performance
    await queryInterface.addIndex('appointments', ['company_id']);
    await queryInterface.addIndex('appointments', ['status']);
    await queryInterface.addIndex('appointments', ['appointment_date_normalized']);
    await queryInterface.addIndex('appointments', ['company_id', 'status']);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('appointments');
}
