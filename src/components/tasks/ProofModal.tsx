import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Camera, FileCheck, Check, UploadCloud } from 'lucide-react';

export const ProofModal: React.FC = () => {
  const {
    isProofModalOpen,
    closeProofModal,
    proofModalTaskId,
    getTaskById,
    submitProof,
  } = useAppStore();

  const [note, setNote] = useState('');
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60'
  );

  if (!isProofModalOpen || !proofModalTaskId) return null;

  const task = getTaskById(proofModalTaskId);
  if (!task) return null;

  const sampleProofs = [
    {
      id: 'receipt',
      label: 'Signed Receipt / Document',
      url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60',
    },
    {
      id: 'gauge',
      label: 'Physical Sensor / Calibration Reading',
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=60',
    },
    {
      id: 'cluster',
      label: 'Terminal Benchmark / Server Telemetry',
      url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=60',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    submitProof(task.id, selectedPhotoUrl, note.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-purple-600" />
              <span>Select Proof Photograph</span>
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {sampleProofs.map((sample) => {
                const isSelected = selectedPhotoUrl === sample.url;
                return (
                  <div
                    key={sample.id}
                    onClick={() => setSelectedPhotoUrl(sample.url)}
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
          </div>

          {/* Completion Note */}
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
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
            <p className="font-semibold mb-0.5">Policy Requirement</p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Once submitted, your proof photo and verification note will be stamped with your ID and timestamp.
              {task.requiresApproval && ' The task creator will review this before final closure.'}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={closeProofModal}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!note.trim()}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Submit Proof</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
