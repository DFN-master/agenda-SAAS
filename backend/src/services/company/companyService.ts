import { Sequelize } from 'sequelize';
import models, { sequelize } from '../../models';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../email/emailService';

/**
 * Create a company and ensure an admin user exists and is linked.
 * - Creates company
 * - Finds or creates a user with company's email as admin
 * - Links user to company via company_users
 * - Optionally emails credentials
 */
export async function createCompanyWithAdmin(payload: { name: string; email: string; phone?: string; plan_id?: string; }) {
  const t = await sequelize.transaction();
  try {
    const { name, email, phone, plan_id } = payload;
    const Company = sequelize.models.Company;
    const User = sequelize.models.User;

    const company = await Company.create({ name, email, phone, plan_id }, { transaction: t });

    let user = await User.findOne({ where: { email }, transaction: t });
    let generatedPassword: string | null = null;

    if (!user) {
      const rawPassword = process.env.DEFAULT_ADMIN_PASSWORD || Math.random().toString(36).slice(-10);
      const hash = await bcrypt.hash(rawPassword, 10);
      user = await User.create({ id: uuidv4(), email, password_hash: hash, role: 'admin' }, { transaction: t });
      generatedPassword = rawPassword;

      // Try to notify via email (best-effort)
      if (process.env.EMAIL_FROM) {
        sendEmail(email, 'Bem-vindo(a) - Acesso de Admin', `Sua conta admin foi criada.\nEmail: ${email}\nSenha temporária: ${rawPassword}\n\nPor favor, altere sua senha após o primeiro login.`).catch(() => {});
      }
    } else {
      // Elevate role if needed
      const role = (user as any).role;
      if (role !== 'admin' && role !== 'super_admin') {
        (user as any).role = 'admin';
        await (user as any).save({ transaction: t });
      }
    }

    // Link user to company
    await sequelize.query(
      'INSERT INTO company_users (id, company_id, user_id) VALUES (:id, :company_id, :user_id) ON CONFLICT DO NOTHING',
      {
        replacements: { id: uuidv4(), company_id: (company as any).id, user_id: (user as any).id },
        transaction: t,
      }
    );

    await t.commit();

    const result = await Company.findByPk((company as any).id, {
      include: [
        { association: 'Plan', attributes: ['id', 'name', 'max_email_connections', 'max_whatsapp_numbers'] },
        { association: 'Users', attributes: ['id', 'email', 'role'], through: { attributes: [] } },
      ],
    });

    return { company: result, user, generatedPassword };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}
