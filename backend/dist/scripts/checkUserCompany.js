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
const models_1 = __importDefault(require("../models"));
(() => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = yield models_1.default.User.findByPk('00000000-0000-0000-0000-000000000001', {
            include: [{
                    model: models_1.default.Company,
                    through: { attributes: [] }
                }]
        });
        console.log('User:', user === null || user === void 0 ? void 0 : user.toJSON());
        console.log('Companies:', (_a = user === null || user === void 0 ? void 0 : user.Companies) === null || _a === void 0 ? void 0 : _a.map((c) => c.toJSON()));
        process.exit(0);
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}))();
