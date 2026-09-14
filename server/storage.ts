import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest } from './gateway';
import { dbEngine } from './db';

export const storageRouter = Router({ mergeParams: true });
const upload = multer({ dest: '/tmp/vcoredb_uploads/' });

// Ensure storage dir exists
const STORAGE_ROOT = path.join(process.cwd(), 'storage_data');
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

// Buckets Management
storageRouter.get('/storage/buckets', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const buckets = dbEngine.db.public.many(
      `SELECT public_id as id, name, is_public, file_size_limit, allowed_mime_types, created_at FROM storage.buckets WHERE project_id = ${projectId} AND deleted_at IS NULL`
    );
    res.json({ buckets });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'BUCKETS_FETCH_FAILED', message: err.message } });
  }
});

storageRouter.post('/storage/buckets', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const { name, is_public, file_size_limit, allowed_mime_types } = req.body;
    const publicId = crypto.randomUUID();

    dbEngine.db.public.none(`
      INSERT INTO storage.buckets (public_id, project_id, name, is_public, file_size_limit)
      VALUES ('${publicId}', ${projectId}, '${name}', ${is_public ? true : false}, ${file_size_limit || 'NULL'})
    `);

    res.status(201).json({ success: true, id: publicId, name });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'CREATE_BUCKET_FAILED', message: err.message } });
  }
});

// Objects Management
storageRouter.post('/storage/buckets/:bucketName/objects', upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const { bucketName } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'No file provided' } });
    }

    const bucket = dbEngine.db.public.one(
      `SELECT id FROM storage.buckets WHERE project_id = ${projectId} AND name = '${bucketName}' AND deleted_at IS NULL`
    ) as any;

    const fileName = req.body.path || file.originalname;
    const objectPublicId = crypto.randomUUID();
    const diskPath = path.join(STORAGE_ROOT, `${projectId}_${bucket.id}_${objectPublicId}`);

    fs.copyFileSync(file.path, diskPath);
    fs.unlinkSync(file.path);

    dbEngine.db.public.none(`
      INSERT INTO storage.objects (public_id, project_id, bucket_id, name, size, mime_type, storage_path)
      VALUES ('${objectPublicId}', ${projectId}, ${bucket.id}, '${fileName}', ${file.size}, '${file.mimetype}', '${diskPath}')
    `);

    res.status(201).json({
      success: true,
      id: objectPublicId,
      name: fileName,
      size: file.size,
      mime_type: file.mimetype,
      path: `/api/v1/projects/${req.project.ref}/storage/buckets/${bucketName}/objects/${objectPublicId}`,
    });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'UPLOAD_FAILED', message: err.message } });
  }
});

storageRouter.get('/storage/buckets/:bucketName/objects/:objectId', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const { objectId } = req.params;

    const objects = dbEngine.db.public.many(
      `SELECT storage_path, mime_type, name FROM storage.objects WHERE project_id = ${projectId} AND (public_id::text = '${objectId}' OR name = '${objectId}') AND deleted_at IS NULL`
    );

    if (objects.length === 0) {
      return res.status(404).json({ error: { code: 'OBJECT_NOT_FOUND', message: 'File not found' } });
    }

    const obj = objects[0] as any;
    if (fs.existsSync(obj.storage_path)) {
      res.setHeader('Content-Type', obj.mime_type);
      fs.createReadStream(obj.storage_path).pipe(res);
    } else {
      res.status(404).json({ error: { code: 'FILE_MISSING', message: 'File missing from storage disk' } });
    }
  } catch (err: any) {
    res.status(500).json({ error: { code: 'DOWNLOAD_FAILED', message: err.message } });
  }
});

storageRouter.delete('/storage/buckets/:bucketName/objects/:objectId', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const { objectId } = req.params;

    dbEngine.db.public.none(
      `UPDATE storage.objects SET deleted_at = NOW() WHERE project_id = ${projectId} AND (public_id::text = '${objectId}' OR name = '${objectId}')`
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'DELETE_FAILED', message: err.message } });
  }
});
