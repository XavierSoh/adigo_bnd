import fs from 'fs';
import multer from 'multer';
import path from 'path';

// Créez une fonction factory pour générer des configurations Multer
export const createUploader = (folder: string) => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            // multer.diskStorage does NOT create the destination directory
            // itself — a first upload into a folder that has never been
            // written to before (e.g. a brand new `createUploader('xyz')`
            // call) fails with ENOENT *before* the request ever reaches the
            // controller, which Express then renders as a raw HTML error
            // page instead of a JSON response (found while wiring VTC
            // driver document uploads: uploads/vtc-drivers/ didn't exist).
            const dest = `uploads/${folder}/`;
            fs.mkdirSync(dest, { recursive: true });
            cb(null, dest);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        }
    });

    return multer({ 
        storage: storage,
        limits: { fileSize: 1024 * 1024 * 5 } // 5MB
    });
};