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
    up(queryInterface) {
        return __awaiter(this, void 0, void 0, function* () {
            // Criar empresa de teste
            yield queryInterface.bulkInsert('companies', [
                {
                    id: '99999999-9999-9999-9999-999999999999',
                    name: 'Empresa Teste',
                    email: 'empresa@teste.com',
                    phone: '(11) 98888-8888',
                    plan_id: '22222222-2222-2222-2222-222222222222', // Plano Profissional
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ]);
            // Associar superadmin com a empresa
            yield queryInterface.bulkInsert('company_users', [
                {
                    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    company_id: '99999999-9999-9999-9999-999999999999',
                    user_id: '00000000-0000-0000-0000-000000000001', // Super Admin
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ]);
        });
    },
    down(queryInterface) {
        return __awaiter(this, void 0, void 0, function* () {
            // Remover associação
            yield queryInterface.bulkDelete('company_users', {
                company_id: '99999999-9999-9999-9999-999999999999',
            });
            // Remover empresa
            yield queryInterface.bulkDelete('companies', {
                id: '99999999-9999-9999-9999-999999999999',
            });
        });
    },
};
