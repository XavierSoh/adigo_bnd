"use strict";
/**
 * Event Upload Middleware
 *
 * Handles image uploads for events (posters, banners, galleries)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadOrganizerLogo = exports.uploadEventGallery = exports.uploadEventBanner = exports.uploadEventPoster = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Create upload directories
const postersDir = path_1.default.join(__dirname, '../../../uploads/events/posters');
const bannersDir = path_1.default.join(__dirname, '../../../uploads/events/banners');
const galleriesDir = path_1.default.join(__dirname, '../../../uploads/events/galleries');
const organizersDir = path_1.default.join(__dirname, '../../../uploads/organizers');
[postersDir, bannersDir, galleriesDir, organizersDir].forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// File filter for images
const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        cb(null, true);
    }
    else {
        cb(new Error('Only images allowed (jpeg, jpg, png, gif, webp)'));
    }
};
// Event poster upload
const posterStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, postersDir),
    filename: (req, file, cb) => {
        const eventId = req.params.eventId || req.params.id || 'new';
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `poster-${eventId}-${timestamp}${ext}`);
    }
});
exports.uploadEventPoster = (0, multer_1.default)({
    storage: posterStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter
});
// Event banner upload
const bannerStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, bannersDir),
    filename: (req, file, cb) => {
        const eventId = req.params.eventId || req.params.id || 'new';
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `banner-${eventId}-${timestamp}${ext}`);
    }
});
exports.uploadEventBanner = (0, multer_1.default)({
    storage: bannerStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter
});
// Event gallery upload (multiple images)
const galleryStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, galleriesDir),
    filename: (req, file, cb) => {
        const eventId = req.params.eventId || req.params.id || 'new';
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `gallery-${eventId}-${timestamp}-${random}${ext}`);
    }
});
exports.uploadEventGallery = (0, multer_1.default)({
    storage: galleryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
    fileFilter: imageFilter
});
// Organizer logo upload
const organizerStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, organizersDir),
    filename: (req, file, cb) => {
        const organizerId = req.params.organizerId || req.params.id || 'new';
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `logo-${organizerId}-${timestamp}${ext}`);
    }
});
exports.uploadOrganizerLogo = (0, multer_1.default)({
    storage: organizerStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: imageFilter
});
