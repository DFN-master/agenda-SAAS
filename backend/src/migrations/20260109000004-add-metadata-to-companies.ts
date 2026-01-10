import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  try {
    // Verificar se coluna já existe
    const table = await queryInterface.describeTable('companies');
    if (table.metadata) {
      console.log('Column metadata already exists in companies table');
      return;
    }

    // Adicionar coluna metadata
    await queryInterface.addColumn('companies', 'metadata', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Stores vocabulary, AI configuration, and other metadata as JSON'
    });

    console.log('✓ Added metadata column to companies table');
  } catch (error) {
    console.error('Error in up migration:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface) {
  try {
    await queryInterface.removeColumn('companies', 'metadata');
    console.log('✓ Removed metadata column from companies table');
  } catch (error) {
    console.error('Error in down migration:', error);
    throw error;
  }
}
