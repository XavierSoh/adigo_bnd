"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadChatMedia = exports.uploadChatFile = exports.uploadChatImage = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure chat uploads directories exist
const chatImagesDir = path_1.default.join(__dirname, '../../uploads/chat/images');
const chatFilesDir = path_1.default.join(__dirname, '../../uploads/chat/files');
if (!fs_1.default.existsSync(chatImagesDir)) {
    fs_1.default.mkdirSync(chatImagesDir, { recursive: true });
}
if (!fs_1.default.existsSync(chatFilesDir)) {
    fs_1.default.mkdirSync(chatFilesDir, { recursive: true });
}
// Storage configuration for chat images
const imageStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, chatImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `chat-image-${uniqueSuffix}${ext}`);
    }
});
// Storage configuration for chat files (documents, PDFs, etc.)
const fileStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, chatFilesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `chat-file-${uniqueSuffix}-${safeName}`);
    }
});
// File filter for images only
const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif|bmp|svg/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|jpg|png|gif|webp|heic|heif|bmp|svg\+xml)/.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    }
    else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp, heic, heif, bmp, svg)'));
    }
};
// File filter for documents (broader range)
const documentFilter = (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|txt|csv|zip|rar/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = /application\/(pdf|msword|vnd\.openxmlformats-officedocument|vnd\.ms-excel|plain|csv|zip|x-rar-compressed|octet-stream)/.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    }
    else {
        cb(new Error('Only document files are allowed (pdf, doc, docx, xls, xlsx, txt, csv, zip, rar)'));
    }
};
// Configure multer for chat images
exports.uploadChatImage = (0, multer_1.default)({
    storage: imageStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for images
    },
    fileFilter: imageFilter
});
// Configure multer for chat documents
exports.uploadChatFile = (0, multer_1.default)({
    storage: fileStorage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit for documents
    },
    fileFilter: documentFilter
});
// Combined upload for any file type (images + documents)
exports.uploadChatMedia = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            // Detect if it's an image or document
            const isImage = /image\/(jpeg|jpg|png|gif|webp|heic|heif)/.test(file.mimetype);
            cb(null, isImage ? chatImagesDir : chatFilesDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path_1.default.extname(file.originalname);
            const isImage = /image\/(jpeg|jpg|png|gif|webp|heic|heif)/.test(file.mimetype);
            const prefix = isImage ? 'chat-image' : 'chat-file';
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            cb(null, `${prefix}-${uniqueSuffix}-${safeName}`);
        }
    }),
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB max
    },
    fileFilter: (req, file, cb) => {
        // Allow both images and documents
        const allowedExtensions = /jpeg|jpg|png|gif|webp|heic|heif|bmp|svg|pdf|doc|docx|xls|xlsx|txt|csv|zip|rar/;
        const allowedMimeTypes = /image\/(jpeg|jpg|png|gif|webp|heic|heif|bmp|svg\+xml)|application\/(pdf|msword|vnd\.openxmlformats-officedocument|vnd\.ms-excel|plain|csv|zip|x-rar-compressed|octet-stream)/;
        const extname = allowedExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedMimeTypes.test(file.mimetype);
        console.log(`📎 [ChatUpload] File: ${file.originalname}, Type: ${file.mimetype}, Ext: ${path_1.default.extname(file.originalname)}`);
        console.log(`📎 [ChatUpload] Ext match: ${extname}, MIME match: ${mimetype}`);
        if (mimetype && extname) {
            console.log(`✅ [ChatUpload] File accepted: ${file.originalname}`);
            return cb(null, true);
        }
        else {
            console.log(`❌ [ChatUpload] File rejected: ${file.originalname}`);
            cb(new Error('File type not allowed. Supported: images (jpg, png, gif, webp, bmp, svg) and documents (pdf, doc, docx, xls, xlsx, txt, csv, zip, rar)'));
        }
    }
});
