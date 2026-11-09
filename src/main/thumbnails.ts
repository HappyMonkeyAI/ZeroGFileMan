import { lstat } from 'node:fs/promises';
import { nativeImage, type NativeImage } from 'electron';
import { isThumbnailCandidate, THUMBNAIL_MAX_BYTES } from '../shared/listing-view.js';
import { resolveLocalPath } from './local-fs.js';

export type ThumbnailResult = {
  dataUrl: string;
  width: number;
  height: number;
};

/**
 * Ask the OS thumbnailer first (Windows shell / macOS Quick Look): it runs off
 * the main thread and reuses the system thumbnail cache. Linux has no such
 * API, and the OS may have no handler for a format, so fall back to a full
 * decode — synchronous, but bounded by THUMBNAIL_MAX_BYTES.
 */
async function decode(target: string, edge: number): Promise<NativeImage | null> {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    try {
      const thumb = await nativeImage.createThumbnailFromPath(target, { width: edge, height: edge });
      if (!thumb.isEmpty()) return thumb;
    } catch {
      /* no OS thumbnail for this file — decode it ourselves */
    }
  }
  return nativeImage.createFromPath(target);
}

/**
 * Decode a local image via Electron nativeImage and return a small data URL.
 * Returns null when the path is ineligible or cannot be decoded.
 */
export async function readThumbnail(path: unknown, maxEdge = 256): Promise<ThumbnailResult | null> {
  const target = resolveLocalPath(path);
  const edge = Math.max(32, Math.min(512, Math.floor(maxEdge)));
  let info;
  try {
    info = await lstat(target);
  } catch {
    return null;
  }
  if (!info.isFile()) return null;
  if (!isThumbnailCandidate(target, info.size, 'file')) return null;
  if (info.size > THUMBNAIL_MAX_BYTES) return null;

  const image = await decode(target, edge);
  if (!image || image.isEmpty()) return null;
  const size = image.getSize();
  if (!size.width || !size.height) return null;
  const longest = Math.max(size.width, size.height);
  const scaled =
    longest > edge
      ? image.resize({
          width: Math.max(1, Math.round((size.width * edge) / longest)),
          height: Math.max(1, Math.round((size.height * edge) / longest))
        })
      : image;
  const out = scaled.getSize();
  return {
    dataUrl: scaled.toDataURL(),
    width: out.width,
    height: out.height
  };
}
