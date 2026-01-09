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
exports.createCompanyWithAdmin = createCompanyWithAdmin;
const models_1 = require("../../models");
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const emailService_1 = require("../email/emailService");
/**
 * Create a company and ensure an admin user exists and is linked.
 * - Creates company
 * - Finds or creates a user with company's email as admin
 * - Links user to company via company_users
 * - Optionally emails credentials
 */
function createCompanyWithAdmin(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const t = yield models_1.sequelize.transaction();
        try {
            const { name, email, phone, plan_id } = payload;
            const Company = models_1.sequelize.models.Company;
            const User = models_1.sequelize.models.User;
            const company = yield Company.create({ name, email, phone, plan_id }, { transaction: t });
            let user = yield User.findOne({ where: { email }, transaction: t });
            let generatedPassword = null;
            if (!user) {
                const rawPassword = process.env.DEFAULT_ADMIN_PASSWORD || Math.random().toString(36).slice(-10);
                const hash = yield bcryptjs_1.default.hash(rawPassword, 10);
                user = yield User.create({ id: (0, uuid_1.v4)(), email, password_hash: hash, role: 'admin' }, { transaction: t });
                generatedPassword = rawPassword;
                // Try to notify via email (best-effort)
                if (process.env.EMAIL_FROM) {
                    (0, emailService_1.sendEmail)(email, 'Bem-vindo(a) - Acesso de Admin', `Sua conta admin foi criada.\nEmail: ${email}\nSenha temporária: ${rawPassword}\n\nPor favor, altere sua senha após o primeiro login.`).catch(() => { });
                }
            }
            else {
                // Elevate role if needed
                const role = user.role;
                if (role !== 'admin' && role !== 'super_admin') {
                    user.role = 'admin';
                    yield user.save({ transaction: t });
                }
            }
            // Link user to company
            yield models_1.sequelize.query('INSERT INTO company_users (id, company_id, user_id) VALUES (:id, :company_id, :user_id) ON CONFLICT DO NOTHING', {
                replacements: { id: (0, uuid_1.v4)(), company_id: company.id, user_id: user.id },
                transaction: t,
            });
            yield t.commit();
            const result = yield Company.findByPk(company.id, {
                include: [
                    { association: 'Plan', attributes: ['id', 'name', 'max_email_connections', 'max_whatsapp_numbers'] },
                    { association: 'Users', attributes: ['id', 'email', 'role'], through: { attributes: [] } },
                ],
            });
            return { company: result, user, generatedPassword };
        }
        catch (err) {
            yield t.rollback();
            throw err;
        }
    });
}
