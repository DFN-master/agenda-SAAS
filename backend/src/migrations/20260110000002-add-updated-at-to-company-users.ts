import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1) Garantir coluna updated_at existente e permitindo NULL
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'company_users' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE company_users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NULL;
        END IF;
      END$$;
    `);

    // 2) Preencher valores nulos com created_at (ou agora)
    await queryInterface.sequelize.query(`
      UPDATE company_users
      SET updated_at = COALESCE(created_at, NOW())
      WHERE updated_at IS NULL;
    `);

    // 3) Tornar NOT NULL
    await queryInterface.sequelize.query(`
      ALTER TABLE company_users
      ALTER COLUMN updated_at SET NOT NULL;
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    // Reverter: permitir NULL
    await queryInterface.sequelize.query(`
      ALTER TABLE company_users
      ALTER COLUMN updated_at DROP NOT NULL;
    `);
  },
};
