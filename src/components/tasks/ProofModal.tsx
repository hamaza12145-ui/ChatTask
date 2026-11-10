import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  X,
  Camera,
  FileCheck,
  Check,
  UploadCloud,
  Upload,
  Image as ImageIcon,
  FileText,
  Trash2,
  Paperclip,
  AlertCircle,
  Loader2,
} from 'lucide-react';

/**
 * Format bytes into human readable size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const ProofModal: React.FC = () => {
  const {
    isProofModalOpen,
    closeProofModal,
    proofModalTaskId,
    getTaskById,
    submitProof,
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'local' | 'sample'>('local');
  const [note, setNote] = useState('');
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localFilePreview, setLocalFilePreview] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState('');
  const [localFileSize, setLocalFileSize] = useState('');
  const [localFileType, setLocalFileType] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isProofModalOpen || !proofModalTaskId) return null;

  const task = getTaskById(proofModalTaskId);
  if (!task) return null;

  // Preset sample proofs available as fallback
  const sampleProofs = [
  ];

  /**
   * Handle local file selection from file dialog or drag & drop
   */
  const handleLocalFile = (file: File) => {
    if (!file) return;

    // 15MB file size limit
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Selected file exceeds 15MB limit. Please choose a smaller file.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLocalFile(file);
      setLocalFilePreview(dataUrl);
      setLocalFileName(file.name);
      setLocalFileSize(formatFileSize(file.size));
      setLocalFileType(file.type || 'application/octet-stream');
      setSelectedPhotoUrl(dataUrl);
      setMode('local');
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the local file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLocalFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLocalFile(file);
    }
  };

  const handleRemoveLocalFile = () => {
    setLocalFile(null);
    setLocalFilePreview(null);
    setLocalFileName('');
    setLocalFileSize('');
    setLocalFileType('');
    setSelectedPhotoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectSample = (url: string) => {
    setSelectedPhotoUrl(url);
    setLocalFile(null);
    setLocalFilePreview(null);
    setLocalFileName('');
    setLocalFileSize('');
    setLocalFileType('image/jpeg');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setErrorMsg('Please enter verification notes.');
      return;
    }

    const effectivePhotoUrl = selectedPhotoUrl || localFilePreview || '';
    if (!effectivePhotoUrl && !localFile) {
      setErrorMsg('Please attach a proof photo or document from your device.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await submitProof(task.id, effectivePhotoUrl, note.trim(), {
        file: localFile || undefined,
        fileName: localFileName || (localFile ? localFile.name : 'proof_sample.jpg'),
        fileType: localFileType || (localFile ? localFile.type : 'image/jpeg'),
        fileSize: localFileSize,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit proof. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isImageFile =
    localFileType.startsWith('image/') ||
    selectedPhotoUrl.startsWith('data:image') ||
    selectedPhotoUrl.includes('images.unsplash');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Submit Completion Proof
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {task.code}: {task.title}
              </p>
            </div>
          </div>
          <button
            onClick={closeProofModal}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Method Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-purple-600" />
                <span>Proof Attachment <span className="text-rose-500">*</span></span>
              </label>
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* MODE 1: LOCAL FILE UPLOAD */}
            {mode === 'local' && (
              <div>
                {!localFilePreview ? (
                  /* Dropzone */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      dragActive
                        ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/30'
                        : 'border-slate-300 dark:border-slate-700 hover:border-purple-500 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Click to browse or drag & drop proof file
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Supports JPG, PNG, WEBP, PDF, DOCX (Max 15MB)
                    </p>
                  </div>
                ) : (
                  /* Selected File Preview Card */
                  <div className="rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                          {isImageFile ? (
                            <ImageIcon className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {localFileName}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {localFileSize} • Ready for upload
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-100/50 dark:hover:bg-purple-900/40 rounded-lg transition-colors"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLocalFile}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Image Preview Thumbnail */}
                    {isImageFile && (
                      <div className="rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800/60 max-h-44 bg-black/10 flex items-center justify-center">
                        <img
                          src={localFilePreview}
                          alt="Proof preview"
                          className="w-full h-44 object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: SAMPLE PRESETS */}
            {mode === 'sample' && (
              <div className="grid grid-cols-3 gap-2">
                {sampleProofs.map((sample) => {
                  const isSelected = selectedPhotoUrl === sample.url;
                  return (
                    <div
                      key={sample.id}
                      onClick={() => handleSelectSample(sample.url)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${
                        isSelected
                          ? 'border-purple-600 shadow-md ring-2 ring-purple-600/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={sample.url}
                        alt={sample.label}
                        className="w-full h-20 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[9px] text-white truncate text-center font-medium">
                        {sample.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Verification Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Verification Notes &amp; Findings <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Detail the work done, measurements recorded, or variances observed..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none transition-all"
            />
          </div>
          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={closeProofModal}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!note.trim() || (!selectedPhotoUrl && !localFile) || isSubmitting}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Submit Proof</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
