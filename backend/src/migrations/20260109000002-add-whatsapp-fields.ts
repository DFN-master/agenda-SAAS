import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    // Adicionar colunas de WhatsApp ao user_connections
    const tableDescription = await queryInterface.describeTable('user_connections');
    
    if (!tableDescription['whatsapp_number']) {
      await queryInterface.addColumn('user_connections', 'whatsapp_number', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!tableDescription['whatsapp_name']) {
      await queryInterface.addColumn('user_connections', 'whatsapp_name', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!tableDescription['whatsapp_status']) {
      await queryInterface.addColumn('user_connections', 'whatsapp_status', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }

    if (!tableDescription['whatsapp_avatar_url']) {
      await queryInterface.addColumn('user_connections', 'whatsapp_avatar_url', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface: QueryInterface) {
    const tableDescription = await queryInterface.describeTable('user_connections');
    
    if (tableDescription['whatsapp_avatar_url']) {
      await queryInterface.removeColumn('user_connections', 'whatsapp_avatar_url');
    }
    if (tableDescription['whatsapp_status']) {
      await queryInterface.removeColumn('user_connections', 'whatsapp_status');
    }
    if (tableDescription['whatsapp_name']) {
      await queryInterface.removeColumn('user_connections', 'whatsapp_name');
    }
    if (tableDescription['whatsapp_number']) {
      await queryInterface.removeColumn('user_connections', 'whatsapp_number');
    }
  },
};
