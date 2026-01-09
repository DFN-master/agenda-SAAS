"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const sequelize = new sequelize_1.Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Remover a foreign key se existir
        try {
            yield sequelize.query(`
        ALTER TABLE ai_conversation_suggestions 
        DROP CONSTRAINT IF EXISTS ai_conversation_suggestions_connection_id_fkey
      `);
            console.log('Foreign key removida');
        }
        catch (e) {
            console.log('Foreign key não existe ou já foi removida');
        }
        // Alterar o tipo da coluna
        yield sequelize.query(`
      ALTER TABLE ai_conversation_suggestions 
      ALTER COLUMN connection_id TYPE VARCHAR(255) USING connection_id::VARCHAR
    `);
        console.log('Coluna connection_id alterada para VARCHAR com sucesso!');
    }
    catch (error) {
        console.error('Erro:', error);
    }
    finally {
        yield sequelize.close();
    }
}))();
