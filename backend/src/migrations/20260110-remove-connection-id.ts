import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (_queryInterface: QueryInterface) => {
    // No-op: manter a coluna connection_id conforme o modelo atual (STRING)
    return Promise.resolve();
  },

  down: async (_queryInterface: QueryInterface) => {
    // No-op
    return Promise.resolve();
  },
};