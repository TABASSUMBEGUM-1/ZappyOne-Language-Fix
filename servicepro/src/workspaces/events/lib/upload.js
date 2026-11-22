/**
 * Upload one file straight to storage and return its key.
 *
 * `presign` is the RTK mutation trigger from usePresignUploadMutation. The key
 * is what gets saved on a record; a signed URL for viewing is minted on read.
 */
import { prepareImage } from '@shared/utils/prepareImage';

// `t` is the translate function, so the errors a partner reads are in their language.
export async function uploadFile(presign, file, { folder = 'event-photos', maxMb = 10, t = (k, fb) => fb } = {}) {
  if (!file) throw new Error(t('sp.ev.noFile', 'No file chosen'));
  file = await prepareImage(file); // eslint-disable-line no-param-reassign
  if (file.size > maxMb * 1024 * 1024) throw new Error(t('sp.ev.tooBig', 'That file is over {n}MB. Pick a smaller one.').replace('{n}', maxMb));
  const contentType = file.type || 'image/jpeg';
  const signed = await presign({ contentType, folder, filename: file.name }).unwrap();
  const put = await fetch(signed.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
  if (!put.ok) throw new Error(t('sp.ev.upFail', 'Upload failed. Check your connection and try again.'));
  return signed.key;
}
