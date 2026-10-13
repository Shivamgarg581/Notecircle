import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getServerSupabase } from './supabase.ts';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export interface SaveAvatarResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Validates file signature (magic bytes) to prevent executable/disguised uploads.
 */
export function validateImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;

  // GIF: GIF8 (GIF87a or GIF89a)
  if (buffer.toString('ascii', 0, 4) === 'GIF8') return true;

  // WEBP: RIFF....WEBP
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return true;
  }

  return false;
}

/**
 * Uploads a profile photo securely to Supabase Storage 'avatars' bucket (with local disk fallback).
 */
export async function saveUserAvatar(userId: string, dataUrl: string): Promise<SaveAvatarResult> {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { success: false, error: 'Valid image data is required.' };
  }

  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches) {
    return { success: false, error: 'Invalid image format. Expected base64 Data URL.' };
  }

  const mimeType = matches[1].toLowerCase();
  const base64Data = matches[2];

  const extension = ALLOWED_MIME_TYPES[mimeType];
  if (!extension) {
    return { success: false, error: 'Unsupported file format. Please upload JPG, PNG, WEBP, or GIF.' };
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > MAX_IMAGE_SIZE) {
    return { success: false, error: 'Image exceeds maximum allowed size of 5MB.' };
  }

  if (!validateImageMagicBytes(buffer)) {
    return { success: false, error: 'Invalid or corrupted image file.' };
  }

  const uploadsDir = path.resolve(process.cwd(), 'data/uploads/avatars');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const safeFilename = `avatar_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extension}`;
  const filePath = path.join(uploadsDir, safeFilename);

  // Write local backup copy
  fs.writeFileSync(filePath, buffer);

  let publicAvatarUrl = `/uploads/avatars/${safeFilename}`;

  // Upload to Supabase Storage 'avatars' bucket for persistence across container restarts
  const sb = getServerSupabase();
  if (sb) {
    try {
      const { error: storageErr } = await sb.storage
        .from('avatars')
        .upload(safeFilename, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (!storageErr) {
        const { data: publicData } = sb.storage.from('avatars').getPublicUrl(safeFilename);
        if (publicData?.publicUrl) {
          publicAvatarUrl = publicData.publicUrl;
        }
      } else {
        console.warn('[Avatar Storage] Supabase upload warning:', storageErr.message);
      }
    } catch (uploadException: any) {
      console.warn('[Avatar Storage] Supabase storage exception:', uploadException?.message || uploadException);
    }
  }

  return {
    success: true,
    avatarUrl: publicAvatarUrl
  };
}

/**
 * Removes an avatar from both Supabase Storage and local disk.
 */
export async function deleteUserAvatar(avatarUrl: string | null | undefined): Promise<void> {
  if (!avatarUrl || typeof avatarUrl !== 'string') return;

  const sb = getServerSupabase();
  const uploadsDir = path.resolve(process.cwd(), 'data/uploads/avatars');

  try {
    if (avatarUrl.startsWith('/uploads/avatars/')) {
      const filename = path.basename(avatarUrl);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else if (avatarUrl.includes('/storage/v1/object/public/avatars/')) {
      const parts = avatarUrl.split('/storage/v1/object/public/avatars/');
      if (parts[1] && sb) {
        await sb.storage.from('avatars').remove([parts[1]]);
      }
    }
  } catch (err: any) {
    console.warn('[Avatar Storage] Failed to delete avatar:', err?.message || err);
  }
}
