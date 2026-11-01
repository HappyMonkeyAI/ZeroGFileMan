import { lstat } from 'node:fs/promises';
import { nativeImage } from 'electron';
import { isThumbnailCandidate, THUMBNAIL_MAX_BYTES } from '../shared/listing-view.js';
import { resolveLocalPath } from './local-fs.js';

export type ThumbnailResult = {
  dataUrl: string;
  width: number;
  height: number;
};

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

  const image = nativeImage.createFromPath(target);
  if (image.isEmpty()) return null;
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
