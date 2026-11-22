import { useRef, useState } from 'react';
import { Upload, Loader2, X, ImageIcon } from 'lucide-react';
import { usePresignUploadMutation } from '../../services/api';
import toast from 'react-hot-toast';
import { prepareImage } from '../../utils/prepareImage';
import { useServiceProT } from '../../i18n/I18nProvider';
import { labelKey } from '../../i18n/translations';

/**
 * Pick an image from the device. Never ask anyone to paste a URL.
 *
 * A "Logo URL" box asks the person filling the form to go and host the file
 * somewhere themselves, then copy an address back — which most people cannot
 * do, and which produces links to someone else's server that rot, hotlink, or
 * 404 in production. The file belongs in our own storage.
 *
 * Uploads through the same presign flow the rest of the app uses, and hands the
 * caller back the stored key. Paste is still possible for the rare operator who
 * genuinely has a CDN address, but it is the small secondary affordance rather
 * than the only one.
 */
export default function ImageUploadField({
  value,
  onChange,
  folder = 'uploads',
  label: labelProp,
  accept = 'image/*',
  maxMb = 5,
}) {
  const t = useServiceProT();
  const label = labelProp ? t(labelKey(labelProp), labelProp) : t('sp.image', 'image');
  const inputRef = useRef(null);
  const [presign] = usePresignUploadMutation();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  async function upload(picked) {
    const file = await prepareImage(picked);
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(t('sp.that_file_is_over_n_mb_pick_a_smaller_one', 'That file is over {n}MB - pick a smaller one').replace('{n}', maxMb));
      return;
    }

    setBusy(true);
    try {
      const res = await presign({
        contentType: file.type || 'image/jpeg',
        folder,
      }).unwrap();

      if (res?.uploadUrl) {
        await fetch(res.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'image/jpeg' },
        });
        // The key is what we store; a signed URL is minted for display later.
        onChange(res.publicUrl || res.key || res.uploadUrl.split('?')[0]);
      } else if (res?.url) {
        onChange(res.url);
      } else {
        throw new Error('Upload did not return a location');
      }

      // Show it immediately — a private bucket will not serve the stored key
      // back until the next read signs it.
      setPreview(URL.createObjectURL(file));
      toast.success(t('sp.label_uploaded', '{label} uploaded').replace('{label}', `${label[0].toUpperCase()}${label.slice(1)}`));
    } catch (err) {
      toast.error(err?.data?.error || t('sp.could_not_upload_that_label', 'Could not upload that {label}').replace('{label}', label));
    } finally {
      setBusy(false);
    }
  }

  const isVideo = /[.](mp4|webm|mov|m4v)([?]|$)/i.test(value || '') || accept.includes('video');
  const shown = preview || (value && /^https?:\/\//.test(value) ? value : null);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          {busy
            ? <><Loader2 size={13} className="animate-spin" /> {t('sp.uploading', 'Uploading…')}</>
            : <><Upload size={13} /> {(value ? t('sp.replace_label', 'Replace {label}') : t('sp.upload_label', 'Upload {label}')).replace('{label}', label)}</>}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setPreview(null); }}
            title={t('sp.remove_label', 'Remove {label}').replace('{label}', label)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          >
            <X size={13} />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>

      {value && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-1.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-white">
            {shown && isVideo
              ? <video src={shown} muted playsInline className="h-full w-full object-cover" />
              : shown
                ? <img src={shown} alt="" className="h-full w-full object-cover" />
                : <ImageIcon size={14} className="text-slate-300" />}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-500" title={value}>
            {value.split('/').pop()}
          </span>
        </div>
      )}

    </div>
  );
}
