import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Create table ai_word_meanings to store semantic vocabulary per company.
 * This supports the IA learning new word meanings fetched from the internet,
 * pending admin approval, and later reuse in responses.
 */
export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable('ai_word_meanings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    company_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    word: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    definition: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
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

  // Unique per company+word to avoid duplicates
  await queryInterface.addIndex('ai_word_meanings', ['company_id', 'word'], {
    unique: true,
    name: 'ai_word_meanings_company_word_unique',
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeIndex('ai_word_meanings', 'ai_word_meanings_company_word_unique');
  await queryInterface.dropTable('ai_word_meanings');
}
