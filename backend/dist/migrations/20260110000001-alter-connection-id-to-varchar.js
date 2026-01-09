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
    up: (queryInterface, sequelize) => __awaiter(void 0, void 0, void 0, function* () {
        // Drop FK if it exists because user_connections.id is integer and connection_id will become varchar
        yield queryInterface.sequelize.query(`DO $$
       BEGIN
         IF EXISTS (
           SELECT 1 FROM information_schema.table_constraints tc
           WHERE tc.table_name = 'ai_conversation_suggestions'
             AND tc.constraint_type = 'FOREIGN KEY'
             AND tc.constraint_name = 'ai_conversation_suggestions_connection_id_fkey'
         ) THEN
           ALTER TABLE ai_conversation_suggestions
             DROP CONSTRAINT ai_conversation_suggestions_connection_id_fkey;
         END IF;
       END $$;`);
        yield queryInterface.sequelize.query(`ALTER TABLE ai_conversation_suggestions ALTER COLUMN connection_id TYPE VARCHAR(255)`);
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.sequelize.query(`ALTER TABLE ai_conversation_suggestions ALTER COLUMN connection_id TYPE INTEGER`);
        // Optional: recreate FK if needed (kept out because connection_id is now string by design)
    }),
};
