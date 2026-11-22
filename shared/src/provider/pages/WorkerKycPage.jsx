import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, CheckCircle2, Clock, XCircle,
  ShieldCheck, FileText, Camera, Loader2, AlertTriangle,
  MapPin, Smartphone, Eye, Lock, MessageSquare, X,
} from 'lucide-react';
import {
  useGetKycStatusQuery, useSubmitKycMutation, usePresignUploadMutation,
  useWorkerRequestDocumentChangeMutation,
} from '../../services/api';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../modules/auth/authSlice';
import LiveSelfieCapture from '../../components/kyc/LiveSelfieCapture';
import toast from 'react-hot-toast';
import { prepareImage } from '../../utils/prepareImage';
import { sendSigned } from '../../utils/sendSigned';
import { useI18n, useServiceProT } from '../../i18n/I18nProvider';

/* Hook: load worker's own doc as blob (no URL expiry) */
function useMyDoc(docType, token, enabled) {
  const [url, setUrl]       = useState(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!enabled || !token) return;
    let cancelled = false;
    setLoading(true);
    // Must use absolute URL — on Vercel+EC2 split, relative /api hits Vercel (404).
    const apiBase = import.meta.env.VITE_API_URL || '';
    fetch(`${apiBase}/api/kyc/stream/${docType}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.blob() : null)
      .then(blob => {
        if (cancelled || !blob) return;
        if (ref.current) URL.revokeObjectURL(ref.current);
        const u = URL.createObjectURL(blob);
        ref.current = u;
        setUrl(u);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [docType, token, enabled]);
  useEffect(() => () => { if (ref.current) URL.revokeObjectURL(ref.current); }, []);
  return { url, loading };
}

/* Read-only doc viewer for the worker's own documents */
function MyDocuments({ token, kycStatus }) {
  const t = useServiceProT();
  const hasDoc = kycStatus !== 'not_submitted';
  const [lightbox, setLightbox] = useState(null);
  const { url: aadhaarUrl, loading: la } = useMyDoc('aadhaar', token, hasDoc);
  const { url: licenseUrl, loading: ll } = useMyDoc('license', token, hasDoc);
  const { url: selfieUrl,  loading: ls } = useMyDoc('selfie',  token, hasDoc);

  const docs = [
    { key: 'aadhaar', label: t('sp.wk.aadhaar', 'Aadhaar Card'),    url: aadhaarUrl, loading: la, Icon: FileText },
    { key: 'license', label: t('sp.wk.license', 'Driving License'), url: licenseUrl, loading: ll, Icon: FileText },
    { key: 'selfie',  label: t('sp.wk.selfie', 'Live Selfie'),     url: selfieUrl,  loading: ls, Icon: Camera   },
  ];

  if (!hasDoc) return null;

  return (
    <div className="card">
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}><X size={22} /></button>
          <img src={lightbox.url} alt={lightbox.label} className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <Lock size={13} className="text-slate-400" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('sp.wk.yourDocs', 'Your submitted documents')}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {docs.map(({ key, label, url, loading, Icon }) => (
          <div key={key} className="space-y-1">
            <div
              className={`aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 ${url ? 'cursor-pointer group' : ''}`}
              onClick={() => url && setLightbox({ url, label })}
            >
              {loading ? (
                <div className="w-full h-full flex items-center justify-center"><Loader2 size={16} className="animate-spin text-slate-300" /></div>
              ) : url ? (
                <div className="relative w-full h-full">
                  <img src={url} alt={label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                    <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Icon size={18} className="text-slate-300" /></div>
              )}
            </div>
            <p className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 text-center mt-2">{t('sp.wk.stored', 'Documents are securely stored and cannot be changed without admin approval')}</p>
    </div>
  );
}

const DOCS = [
  { key: 'aadhaarUrl', label: 'Aadhaar Card (Front)', tk: 'sp.wk.aadhaarF', sublabel: 'Government-issued ID - clear photo, all 4 corners visible', sk: 'sp.wk.aadhaarSub', Icon: FileText, required: true,  liveCam: false },
  // Optional: a shop technician fixing phones at the bench need not drive.
  { key: 'licenseUrl', label: 'Driving License',       tk: 'sp.wk.license', sublabel: 'Optional - add it if you ride to customers', sk: 'sp.wk.licenseSub', Icon: FileText, required: false, liveCam: false },
];

export default function WorkerKycPage() {
  const t = useServiceProT();
  const { lang } = useI18n();
  const nav = useNavigate();
  const { accessToken: token } = useSelector(selectAuth);
  const { data, refetch, isLoading } = useGetKycStatusQuery();
  const [presign]                    = usePresignUploadMutation();
  const [submitKyc, { isLoading: submitting }] = useSubmitKycMutation();
  const [requestChange, { isLoading: requesting }] = useWorkerRequestDocumentChangeMutation();

  const [urls, setUrls]           = useState({});
  const [selfieMetadata, setSelfieMetadata] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeMsg, setChangeMsg]   = useState('');

  const status          = data?.kyc?.status || 'not_submitted';
  const rejectionReason = data?.kyc?.rejectionReason;
  const changeRequest   = data?.kyc?.changeRequest;
  const clarification   = data?.kyc?.clarification;
  // Admin asked for a fix ("upload a clear selfie") — re-open the upload form
  // even though the submission is still technically pending_review.
  const needsClarification = status === 'pending_review' && clarification?.active;
  // Asked for named documents again: only those are opened; the rest are kept.
  const asked = needsClarification && clarification.docCodes?.length ? new Set(clarification.docCodes) : null;
  const opens = (key) => !asked || asked.has(key);
  const ready = asked ? [...asked].every((k) => urls[k]) : !!(urls.aadhaarUrl && urls.selfieUrl);
  const DOC_NAME = { aadhaarUrl: t('sp.wk.dAadhaar', 'Aadhaar'), licenseUrl: t('sp.wk.dLicense', 'Driving licence'), selfieUrl: t('sp.wk.dSelfie', 'Live selfie') };

  async function handleRequestChange() {
    if (changeMsg.trim().length < 10) { toast.error(t('sp.wk.changeShort', 'Please describe why you need to change documents (min 10 chars)')); return; }
    try {
      await requestChange(changeMsg.trim()).unwrap();
      toast.success(t('sp.wk.changeOk', 'Change request sent to admin for review'));
      setShowChangeRequest(false);
      setChangeMsg('');
      refetch();
    } catch (err) { toast.error(err.data?.error || t('sp.wk.failed', 'Failed')); }
  }


  /* File upload (Aadhaar / License) */
  async function handleUpload(docKey, picked) {
    const file = await prepareImage(picked);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t('sp.wk.tooBig', 'File too large - max 5MB')); return; }
    try {
      setUploading(docKey);
      const type = file.type || 'image/jpeg';
      const signed = await sendSigned(() => presign({ folder: 'kyc', contentType: type }).unwrap(), file, type);
      setUrls((prev) => ({ ...prev, [docKey]: signed.key }));
      toast.success(t('sp.wk.upOk', 'Document uploaded'));
    } catch (err) {
      toast.error(t('sp.wk.upFail', 'Document upload failed. Please try again.'));
    } finally {
      setUploading(null);
    }
  }

  /* Live selfie capture callback */
  async function handleSelfieCaptured(blob, metadata) {
    setShowCamera(false);
    try {
      setUploading('selfieUrl');
      const signed = await sendSigned(() => presign({ folder: 'kyc', contentType: 'image/jpeg' }).unwrap(), blob, 'image/jpeg');
      setUrls((prev) => ({ ...prev, selfieUrl: signed.key }));
      setSelfieMetadata(metadata);
      toast.success(t('sp.wk.selOk', 'Selfie captured ✓'));
    } catch (err) {
      toast.error(t('sp.wk.selFail', 'Selfie upload failed. Please try again.'));
    } finally {
      setUploading(null);
    }
  }

  /* Submit */
  async function submit() {
    if (!ready) {
      toast.error(asked ? t('sp.wk.needNew', 'Add a new copy of each document asked for') : t('sp.wk.needBoth', 'Aadhaar and a live selfie are required'));
      return;
    }
    // Location is mandatory — the live selfie must carry GPS coordinates.
    if (opens('selfieUrl') && (typeof selfieMetadata?.lat !== 'number' || typeof selfieMetadata?.lng !== 'number')) {
      toast.error(t('sp.wk.needGps', 'Location is required. Please enable GPS and recapture your live selfie.'));
      return;
    }
    try {
      const body = asked ? Object.fromEntries([...asked].map((k) => [k, urls[k]])) : { ...urls };
      await submitKyc({ ...body, ...(opens('selfieUrl') && { selfieMetadata }) }).unwrap();
      toast.success(t('sp.wk.sent', 'Documents sent. We will check them'));
      refetch();
    } catch (err) {
      toast.error(err.data?.error || t('sp.wk.subFail', 'Submission failed'));
    }
  }

  /* Loading / status screens */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <Loader2 size={28} className="text-zappy-600 animate-spin" />
      </div>
    );
  }

  if (status === 'pending_review' && !needsClarification) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <header className="page-header"><div className="page-header-inner">
          <button onClick={() => nav('/worker')} className="back-btn"><ArrowLeft size={18} strokeWidth={2.5} /></button>
          <h1 className="h-card">{t('sp.wk.idCheck', 'ID check')}</h1>
        </div></header>
        <div className="max-w-lg lg:max-w-2xl mx-auto px-4 pt-4 space-y-3">
          <div className="card bg-amber-50 ring-1 ring-amber-200 flex items-center gap-3">
            <Clock size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-amber-800 text-sm">{t('sp.wk.review', 'Under Review')}</p>
              <p className="text-xs text-amber-600 mt-0.5">{t('sp.wk.reviewH', "Your documents are being checked. We'll notify you within 24 hours.")}</p>
            </div>
          </div>
          <MyDocuments token={token} kycStatus={status} />
        </div>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-[#F9FAFB] pb-10">
        <header className="page-header"><div className="page-header-inner">
          <button onClick={() => nav('/worker')} className="back-btn"><ArrowLeft size={18} strokeWidth={2.5} /></button>
          <h1 className="h-card">{t('sp.wk.idCheck', 'ID check')}</h1>
        </div></header>
        <div className="max-w-lg lg:max-w-2xl mx-auto px-4 pt-4 space-y-3">
          <div className="card bg-success-50 ring-1 ring-success-200 flex items-center gap-3">
            <ShieldCheck size={18} className="text-success-600 shrink-0" />
            <div>
              <p className="font-bold text-success-800 text-sm">{t('sp.wk.checked', 'ID checked')}</p>
              <p className="text-xs text-success-600 mt-0.5">{t('sp.wk.checkedH', 'Your identity is verified. Go online and start accepting jobs.')}</p>
            </div>
          </div>

          <MyDocuments token={token} kycStatus={status} />

          {changeRequest?.status === 'pending' && (
            <div className="card bg-amber-50 ring-1 ring-amber-200">
              <div className="flex items-start gap-2">
                <Clock size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">{t('sp.wk.pendingChg', 'Change request pending admin review')}</p>
                  <p className="text-xs text-amber-600 mt-0.5 italic">"{changeRequest.message}"</p>
                  <p className="text-[11px] text-amber-500 mt-1">{t('sp.wk.notified', "You'll be notified once reviewed.")}</p>
                </div>
              </div>
            </div>
          )}

          {changeRequest?.status === 'denied' && (
            <div className="card bg-red-50 ring-1 ring-red-200">
              <XCircle size={14} className="text-red-500" />
              <p className="text-sm font-bold text-red-800 ml-2 inline">{t('sp.wk.denied', 'Change request denied')}</p>
              {changeRequest.denialReason && <p className="text-xs text-red-600 mt-1">{changeRequest.denialReason}</p>}
            </div>
          )}

          {!changeRequest && !showChangeRequest && (
            <button onClick={() => setShowChangeRequest(true)}
              className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-600 font-semibold text-sm py-3 rounded-xl hover:bg-slate-50 transition">
              <MessageSquare size={14} /> {t('sp.wk.reqChange', 'Request document change')}
            </button>
          )}

          {showChangeRequest && (
            <div className="card space-y-3">
              <p className="text-sm font-bold text-slate-800">{t('sp.wk.whyChange', 'Why do you need to change documents?')}</p>
              <p className="text-xs text-slate-400">{t('sp.wk.whyH', 'Admin will review and approve before you can upload new documents.')}</p>
              <textarea rows={3} autoFocus
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zappy-500 resize-none"
                placeholder={t('sp.wk.whyP', 'e.g. My Aadhaar has been renewed with a new address…')}
                value={changeMsg} onChange={e => setChangeMsg(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => { setShowChangeRequest(false); setChangeMsg(''); }}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition">{t('sp.wk.cancel', 'Cancel')}</button>
                <button onClick={handleRequestChange} disabled={requesting || changeMsg.trim().length < 10}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-zappy-600 hover:bg-zappy-700 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl transition">
                  {requesting ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
                  {t('sp.wk.send', 'Send Request')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const selfieUploaded = !!urls.selfieUrl;
  const selfieUploading = uploading === 'selfieUrl';

  return (
    <>
      {showCamera && (
        <LiveSelfieCapture
          onCapture={handleSelfieCaptured}
          onCancel={() => setShowCamera(false)}
        />
      )}

      <div className="min-h-screen bg-[#F9FAFB] pb-40">
        <header className="page-header">
          <div className="page-header-inner">
            <button onClick={() => nav('/worker')} className="back-btn">
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div>
              <p className="t-label">{t('sp.wk.idCheck', 'ID check')}</p>
              <p className="font-semibold text-[#0F172A]">{t('sp.wk.idDocs', 'ID documents')}</p>
            </div>
          </div>
        </header>

        <div className="max-w-lg lg:max-w-2xl mx-auto px-4 pt-4 space-y-3">

          {/* Admin clarification — action needed, re-upload requested */}
          {needsClarification && (
            <div className="card bg-amber-50 ring-1 ring-amber-200">
              <div className="flex items-start gap-3">
                <MessageSquare size={16} strokeWidth={2} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">{t('sp.wk.actionAdmin', 'Action needed from admin')}</p>
                  <p className="text-sm text-amber-700 mt-1 leading-relaxed">{clarification.message}</p>
                  <p className="text-xs text-amber-600 mt-1.5">
                    {asked
                      ? t('sp.wk.sendAgain', 'Send again: {n}. Everything else is kept.').replace('{n}', [...asked].map((k) => DOC_NAME[k] || k).join(', '))
                      : t('sp.wk.fixAbove', 'Please fix the above and re-upload your documents below.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rejection notice */}
          {status === 'rejected' && rejectionReason && (
            <div className="card bg-red-50 ring-1 ring-red-200">
              <div className="flex items-start gap-3">
                <XCircle size={16} strokeWidth={2} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{t('sp.wk.prevRej', 'Previous Submission Rejected')}</p>
                  <p className="text-sm text-red-600 mt-1 leading-relaxed">{rejectionReason}</p>
                  <p className="text-xs text-red-500 mt-1.5">{t('sp.wk.reupload', 'Please re-upload and resubmit your documents.')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="card bg-zappy-50 ring-zappy-100">
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} strokeWidth={2} className="text-zappy-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-zappy-700 leading-relaxed">
                {t('sp.wk.encrypted', 'Documents are encrypted and used only for identity verification. Submissions are reviewed within 24 hours.')}
              </p>
            </div>
          </div>

          {/* Document uploads (Aadhaar + License) */}
          {DOCS.map(({ key, label, tk, sublabel, sk, Icon, required }) => {
            const uploaded    = !!urls[key];
            const isUploading = uploading === key;
            return (
              <div key={key} className={`card ${uploaded ? 'ring-success-200 bg-success-50/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${uploaded ? 'bg-success-100' : 'bg-slate-100'}`}>
                    <Icon size={18} strokeWidth={1.75} className={uploaded ? 'text-success-600' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm text-[#0F172A]">{t(tk, label)}</p>
                      {required && <span className="text-red-500 text-xs font-bold">*</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{opens(key) ? t(sk, sublabel) : t('sp.wk.accepted', 'Accepted, nothing to change')}</p>
                    {uploaded && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <CheckCircle2 size={12} strokeWidth={2.5} className="text-success-600" />
                        <span className="text-xs font-semibold text-success-700">{t('sp.wk.uploaded', 'Uploaded')}</span>
                      </div>
                    )}
                  </div>
                  {opens(key) && <label className={`btn-secondary cursor-pointer text-xs py-2 px-3 ${isUploading ? 'opacity-50' : ''}`}>
                    {isUploading ? (
                      <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> {t('sp.wk.uploading', 'Uploading')}</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Upload size={11} strokeWidth={2.5} />{uploaded ? t('sp.wk.replace', 'Replace') : t('sp.wk.upload', 'Upload')}</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => handleUpload(key, e.target.files?.[0])}
                    />
                  </label>}
                </div>
              </div>
            );
          })}

          {/* Live Selfie Card */}
          <div className={`card ${selfieUploaded ? 'ring-success-200 bg-success-50/30' : 'ring-zappy-100 bg-zappy-50/30'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selfieUploaded ? 'bg-success-100' : 'bg-zappy-100'}`}>
                {selfieUploading
                  ? <Loader2 size={18} className="animate-spin text-zappy-500" />
                  : <Camera size={18} strokeWidth={1.75} className={selfieUploaded ? 'text-success-600' : 'text-zappy-500'} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm text-[#0F172A]">{t('sp.wk.selfie', 'Live Selfie')}</p>
                  <span className="text-red-500 text-xs font-bold">*</span>
                  <span className="text-[10px] font-bold bg-zappy-100 text-zappy-700 px-1.5 py-0.5 rounded-full">{t('sp.wk.liveOnly', 'LIVE ONLY')}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{t('sp.wk.selfieH', 'Photo taken live from your front camera - gallery not allowed')}</p>

                {selfieUploaded && selfieMetadata ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} strokeWidth={2.5} className="text-success-600" />
                      <span className="text-xs font-semibold text-success-700">{t('sp.wk.captured', 'Live photo captured')}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {selfieMetadata.lat && (
                        <div className="flex items-center gap-1">
                          <MapPin size={10} className="text-green-500" />
                          <span className="text-[10px] text-slate-500 font-medium">{t('sp.wk.locOk', 'Location verified')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Smartphone size={10} className="text-zappy-400" />
                        <span className="text-[10px] text-slate-500 font-medium">
                          {new Date(selfieMetadata.capturedAt).toLocaleTimeString(`${lang}-IN`, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {!selfieUploading && opens('selfieUrl') && (
                <button
                  onClick={() => setShowCamera(true)}
                  className={`btn-secondary text-xs py-2 px-3 ${selfieUploaded ? 'border-success-200 text-success-700' : 'border-zappy-200 text-zappy-700'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Camera size={11} strokeWidth={2.5} />
                    {selfieUploaded ? t('sp.wk.retake', 'Retake') : t('sp.wk.openCam', 'Open Camera')}
                  </span>
                </button>
              )}
            </div>

            {/* Liveness info strip */}
            {!selfieUploaded && (
              <div className="mt-3 pt-3 border-t border-zappy-100">
                <p className="text-[10px] font-bold text-zappy-600 uppercase tracking-wide mb-2">{t('sp.wk.whatCheck', 'What we check')}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { icon: Camera,   label: t('sp.wk.c1', 'Live camera only')    },
                    { icon: MapPin,   label: t('sp.wk.c2', 'GPS at capture time') },
                    { icon: CheckCircle2, label: t('sp.wk.c3', 'Liveness prompt') },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 ring-1 ring-zappy-100">
                      <Icon size={10} className="text-zappy-500 shrink-0" />
                      <span className="text-[10px] font-semibold text-slate-600 leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* submit bar */}
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 safe-pb">
          <div className="max-w-lg lg:max-w-2xl mx-auto px-4 pt-3 pb-2">
            <button
              onClick={submit}
              disabled={submitting || !ready}
              className="btn-primary w-full"
            >
              {submitting
                ? <><Loader2 size={15} className="animate-spin" /> {t('sp.wk.submitting', 'Submitting…')}</>
                : <><ShieldCheck size={15} strokeWidth={2.5} /> {t('sp.wk.submit', 'Submit for Verification')}</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function StatusScreen({ type, onBack }) {
  const t = useServiceProT();
  const isPending = type === 'pending';
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <header className="page-header">
        <div className="page-header-inner">
          <button onClick={onBack} className="back-btn"><ArrowLeft size={18} strokeWidth={2.5} /></button>
          <h1 className="h-card">{t('sp.wk.idCheck', 'ID check')}</h1>
        </div>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6 text-center">
        <div className={`w-20 h-20 rounded-card flex items-center justify-center ${isPending ? 'bg-amber-50' : 'bg-success-50'}`}>
          {isPending
            ? <Clock size={40} strokeWidth={1.5} className="text-amber-500" />
            : <ShieldCheck size={40} strokeWidth={1.5} className="text-success-600" />
          }
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">
            {isPending ? t('sp.wk.review', 'Under Review') : t('sp.wk.checked', 'ID checked')}
          </h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-xs">
            {isPending
              ? t('sp.wk.reviewH2', 'Your documents are being checked. We will notify you within 24 hours.')
              : t('sp.wk.statusFmt', 'Your identity is verified. Go online to start receiving job requests.')
            }
          </p>
        </div>
        <button onClick={onBack} className="btn-primary px-8">{t('sp.wk.back2', 'Back to Dashboard')}</button>
      </div>
    </div>
  );
}
