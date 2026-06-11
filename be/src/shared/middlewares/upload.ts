import multer from 'multer';
import { config } from '@config/index';

const memoryStorage = multer.memoryStorage();

export const materialMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
]);

export function isAllowedMaterialMimeType(mimetype: string): boolean {
  return materialMimeTypes.has(mimetype);
}

function createImageUpload() {
  return multer({
    storage: memoryStorage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        return;
      }

      cb(null, true);
    },
  });
}

function createMaterialUpload() {
  return multer({
    storage: memoryStorage,
    limits: {
      fileSize: config.upload.materialMaxSizeMb * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      if (!isAllowedMaterialMimeType(file.mimetype)) {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        return;
      }

      cb(null, true);
    },
  });
}

export const avatarUpload = createImageUpload();

export const courseThumbnailUpload = createImageUpload();

export const lessonMaterialUpload = createMaterialUpload();

export const assignmentSubmissionUpload = createMaterialUpload();
