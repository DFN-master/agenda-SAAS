const { DataTypes } = require('sequelize');
const { sequelize } = require('../services/database');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = Appointment;