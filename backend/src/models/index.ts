import { Sequelize } from 'sequelize';
import UserModel from './user';
import CompanyModel from './company';

const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  logging: false,
});

const models = {
  User: UserModel(sequelize),
  Company: CompanyModel(sequelize),
};

Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

export { sequelize };
export default models;