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
            yield queryInterface.bulkInsert('plans', [
                {
                    id: '11111111-1111-1111-1111-111111111111',
                    name: 'Plano Básico',
                    max_email_connections: 1,
                    max_whatsapp_numbers: 1,
                    price: 49.90,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                {
                    id: '22222222-2222-2222-2222-222222222222',
                    name: 'Plano Profissional',
                    max_email_connections: 5,
                    max_whatsapp_numbers: 3,
                    price: 149.90,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                {
                    id: '33333333-3333-3333-3333-333333333333',
                    name: 'Plano Empresarial',
                    max_email_connections: 20,
                    max_whatsapp_numbers: 10,
                    price: 499.90,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ]);
        });
    },
    down(queryInterface) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryInterface.bulkDelete('plans', {
                id: [
                    '11111111-1111-1111-1111-111111111111',
                    '22222222-2222-2222-2222-222222222222',
                    '33333333-3333-3333-3333-333333333333',
                ],
            });
        });
    },
};
