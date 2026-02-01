"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploader = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Créez une fonction factory pour générer des configurations Multer
const createUploader = (folder) => {
    const storage = multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            cb(null, `uploads/${folder}/`);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path_1.default.extname(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        }
    });
    return (0, multer_1.default)({
        storage: storage,
        limits: { fileSize: 1024 * 1024 * 5 } // 5MB
    });
};
exports.createUploader = createUploader;
