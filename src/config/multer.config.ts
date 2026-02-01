import multer from 'multer';
import path from 'path';

// Créez une fonction factory pour générer des configurations Multer
export const createUploader = (folder: string) => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, `uploads/${folder}/`);
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