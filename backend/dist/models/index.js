"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const user_1 = __importDefault(require("./user"));
const company_1 = __importDefault(require("./company"));
const plan_1 = __importDefault(require("./plan"));
const userConnection_1 = __importDefault(require("./userConnection"));
const aiEvent_1 = __importDefault(require("./aiEvent"));
const aiConversationSuggestion_1 = __importDefault(require("./aiConversationSuggestion"));
const aiConversationMessage_1 = __importDefault(require("./aiConversationMessage"));
const aiKnowledgeBase_1 = __importDefault(require("./aiKnowledgeBase"));
const aiLearnedConcept_1 = __importDefault(require("./aiLearnedConcept"));
const aiWordMeaning_1 = __importDefault(require("./aiWordMeaning"));
const sequelize = new sequelize_1.Sequelize(process.env.DATABASE_URL || '', {
    dialect: 'postgres',
    logging: false,
});
exports.sequelize = sequelize;
const models = {
    User: (0, user_1.default)(sequelize),
    Plan: (0, plan_1.default)(sequelize),
    Company: (0, company_1.default)(sequelize),
    UserConnection: (0, userConnection_1.default)(sequelize),
    AiEvent: (0, aiEvent_1.default)(sequelize),
    AiConversationSuggestion: (0, aiConversationSuggestion_1.default)(sequelize),
    AiConversationMessage: (0, aiConversationMessage_1.default)(sequelize),
    AiKnowledgeBase: (0, aiKnowledgeBase_1.default)(sequelize),
    AiLearnedConcept: (0, aiLearnedConcept_1.default)(sequelize),
    AiWordMeaning: (0, aiWordMeaning_1.default)(sequelize),
};
Object.values(models).forEach((model) => {
    if (model.associate) {
        model.associate(models);
    }
});
exports.default = models;
