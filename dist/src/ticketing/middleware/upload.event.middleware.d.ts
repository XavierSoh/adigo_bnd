/**
 * Event Upload Middleware
 *
 * Handles image uploads for events (posters, banners, galleries)
 */
import multer from 'multer';
export declare const uploadEventPoster: multer.Multer;
export declare const uploadEventBanner: multer.Multer;
export declare const uploadEventGallery: multer.Multer;
export declare const uploadOrganizerLogo: multer.Multer;
