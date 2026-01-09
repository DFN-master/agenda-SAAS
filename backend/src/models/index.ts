import { Sequelize } from 'sequelize';
import UserModel from './user';
import CompanyModel from './company';
import PlanModel from './plan';
import UserConnectionModel from './userConnection';
import AiEventModel from './aiEvent';
import AiConversationSuggestionModel from './aiConversationSuggestion';
import AiConversationMessageModel from './aiConversationMessage';

const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  logging: false,
});

const models = {
  User: UserModel(sequelize),
  Plan: PlanModel(sequelize),
  Company: CompanyModel(sequelize),
  UserConnection: UserConnectionModel(sequelize),
  AiEvent: AiEventModel(sequelize),
  AiConversationSuggestion: AiConversationSuggestionModel(sequelize),
  AiConversationMessage: AiConversationMessageModel(sequelize),
};

Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

export { sequelize };
export default models;