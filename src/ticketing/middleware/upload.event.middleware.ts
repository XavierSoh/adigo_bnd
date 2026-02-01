/**
 * Event Upload Middleware
 *
 * Handles image uploads for events (posters, banners, galleries)
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create upload directories
const postersDir = path.join(__dirname, '../../../uploads/events/posters');
const bannersDir = path.join(__dirname, '../../../uploads/events/banners');
const galleriesDir = path.join(__dirname, '../../../uploads/events/galleries');
const organizersDir = path.join(__dirname, '../../../uploads/organizers');

[postersDir, bannersDir, galleriesDir, organizersDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// File filter for images
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Only images allowed (jpeg, jpg, png, gif, webp)'));
    }
};

// Event poster upload
const posterStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, postersDir),
    filename: (req, file, cb) => {
        const eventId = req.params.eventId || req.params.id || 'new';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `poster-${eventId}-${timestamp}${ext}`);
    }
});

export const uploadEventPoster = multer({
    storage: posterStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter
});

// Event banner upload
const bannerStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, bannersDir),
    filename: (req, file, cb) => {
        const eventId = req.params.eventId || req.params.id || 'new';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `banner-${eventId}-${timestamp}${ext}`);
    }
});

export const uploadEventBanner = multer({
    storage: bannerStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter
});

// Event gallery upload (multiple images)
const galleryStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, galleriesDir),
    filename: (req, file, cb) => {
        const eventId = req.params.eventId || req.params.id || 'new';
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `gallery-${eventId}-${timestamp}-${random}${ext}`);
    }
});

export const uploadEventGallery = multer({
    storage: galleryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
    fileFilter: imageFilter
});

// Organizer logo upload
const organizerStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, organizersDir),
    filename: (req, file, cb) => {
        const organizerId = req.params.organizerId || req.params.id || 'new';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `logo-${organizerId}-${timestamp}${ext}`);
    }
});

export const uploadOrganizerLogo = multer({
    storage: organizerStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: imageFilter
});
