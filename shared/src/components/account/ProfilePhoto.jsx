import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Camera, Loader2, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePresignUploadMutation, useSetAccountPhotoMutation } from '../../services/api';
import { updateProfile } from '../../modules/auth/authSlice';
import { prepareImage } from '../../utils/prepareImage';
import { useServiceProT } from '../../i18n/I18nProvider';
import { labelKey } from '../../i18n/translations';

const FOLDER = { shop: 'shop', event_partner: 'event-photos' };
const MAX_MB = 8;

/**
 * The account's photo with a camera button to change it. One component for
 * every app, saving to the same place, so the photo on the dashboard, in
 * settings and on the setup screen is always the same one.
 *
 *   url    the current photo (account status `photoUrl`)
 *   role   the account type, for where the upload goes
 *   size   circle size in px
 *   label  what the photo is ("Your photo", "Shop photo")
 */
export default function ProfilePhoto({ url, role = 'user', size = 88, label: labelIn = 'Your photo', onSaved }) {
  const t = useServiceProT();
  const label = t(labelKey(labelIn), labelIn);
  const dispatch = useDispatch();
  const input = useRef(null);
  const [preview, setPreview] = useState(null);
  const [presign] = usePresignUploadMutation();
  const [save, { isLoading: saving }] = useSetAccountPhotoMutation();
  const [uploading, setUploading] = useState(false);
  const busy = uploading || saving;

  async function pick(e) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    const file = await prepareImage(picked);
    if (!file.type.startsWith('image/')) { toast.error(t('sp.choose_a_photo', 'Choose a photo.')); return; }
    if (file.size > MAX_MB * 1024 * 1024) { toast.error(t('sp.that_photo_is_over_n_mb_choose_a_smaller_one', 'That photo is over {n}MB. Choose a smaller one.').replace('{n}', MAX_MB)); return; }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const signed = await presign({ folder: FOLDER[role] || 'profile', contentType: file.type, filename: file.name }).unwrap();
      const put = await fetch(signed.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!put.ok) throw new Error('upload');
      const st = await save(signed.key).unwrap();
      dispatch(updateProfile({ avatar: st.photoUrl }));
      toast.success(t('sp.photo_saved', 'Photo saved'));
      onSaved?.(st);
    } catch (err) {
      setPreview(null);
      toast.error(err?.data?.error || t('sp.the_photo_did_not_upload_check_your_connection_and_try_again', 'The photo did not upload. Check your connection and try again.'));
    } finally { setUploading(false); }
  }

  const shown = preview || url;
  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label={(shown ? t('sp.change_x', 'Change {x}') : t('sp.add_x', 'Add {x}')).replace('{x}', label.toLowerCase())}
        className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-zappy-600 focus-visible:ring-offset-2"
        style={{ width: size, height: size }}>
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-line bg-sunken">
          {shown ? <img src={shown} alt={label} className="h-full w-full object-cover" /> : <UserRound size={size * 0.42} className="text-ink-400" />}
        </span>
        <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-zappy-600 text-white">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
      <span className="text-[13px] font-semibold text-zappy-600">{shown ? t('sp.change_photo', 'Change photo') : t('sp.add_a_photo', 'Add a photo')}</span>
    </div>
  );
}
