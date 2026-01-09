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
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    up: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        // 1) Garantir coluna updated_at existente e permitindo NULL
        yield queryInterface.sequelize.query(`
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
        yield queryInterface.sequelize.query(`
      UPDATE company_users
      SET updated_at = COALESCE(created_at, NOW())
      WHERE updated_at IS NULL;
    `);
        // 3) Tornar NOT NULL
        yield queryInterface.sequelize.query(`
      ALTER TABLE company_users
      ALTER COLUMN updated_at SET NOT NULL;
    `);
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        // Reverter: permitir NULL
        yield queryInterface.sequelize.query(`
      ALTER TABLE company_users
      ALTER COLUMN updated_at DROP NOT NULL;
    `);
    }),
};
