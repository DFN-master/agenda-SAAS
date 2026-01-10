import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class Appointment extends Model {
    static associate(models: any) {
      // Appointment belongs to Company
      Appointment.belongsTo(models.Company, {
        foreignKey: 'company_id',
      });

      // Appointment belongs to User (who created it)
      Appointment.belongsTo(models.User, {
        foreignKey: 'user_id',
      });

      // Company has many Appointments
      models.Company.hasMany(Appointment, {
        foreignKey: 'company_id',
      });

      // User has many Appointments
      models.User.hasMany(Appointment, {
        foreignKey: 'user_id',
      });
    }
  }

  Appointment.init(
    {
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
        comment: 'Usuário que criou o agendamento',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas adicionais sobre o agendamento',
      },
    },
    {
      sequelize,
      modelName: 'Appointment',
      tableName: 'appointments',
      underscored: true,
    }
  );

  return Appointment;
};
