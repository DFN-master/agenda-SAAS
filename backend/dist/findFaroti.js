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
        const [companies] = yield sequelize.query(`
      SELECT c.id, c.name, u.id as user_id, u.email 
      FROM companies c
      LEFT JOIN company_users cu ON c.id = cu.company_id
      LEFT JOIN users u ON cu.user_id = u.id
      WHERE LOWER(c.name) LIKE '%faroti%' OR LOWER(c.name) LIKE '%faro%'
    `);
        console.log('Empresas encontradas:', JSON.stringify(companies, null, 2));
    }
    catch (error) {
        console.error('Erro:', error);
    }
    finally {
        yield sequelize.close();
    }
}))();
