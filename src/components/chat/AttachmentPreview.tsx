import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TaskAttachment } from '../../types';
import { FileText, Download, Eye, ExternalLink, X, Image as ImageIcon } from 'lucide-react';

interface AttachmentPreviewProps {
  attachment: TaskAttachment;
  isOwn?: boolean;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachment, isOwn = false }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isImage = attachment.type === 'image';

  const handleClose = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsPreviewOpen(false);
  }, []);

  // Keyboard shortcut: close preview on Escape key
  useEffect(() => {
    if (!isPreviewOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPreviewOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Prevent background scrolling while preview is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isPreviewOpen]);

  // Modal content rendered through Portal to escape chat DOM hierarchy and stacking contexts
  const modalContent = isPreviewOpen ? (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150 cursor-pointer"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={attachment.name}
    >
      <div
        className="relative max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-2 min-w-0 pr-3">
            {isImage ? (
              <ImageIcon className="w-4 h-4 text-[#009966] shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-[#009966] shrink-0" />
            )}
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={attachment.name}>
              {attachment.name}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            onTouchEnd={handleClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Close preview (Esc)"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-50 dark:bg-slate-950 min-h-[300px]">
          {isImage ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm select-none"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#009966] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {attachment.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Document size: {attachment.size || '1.2 MB'} · Format: {attachment.type.toUpperCase()}
              </p>
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#009966] hover:bg-[#008055] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {isImage ? (
        <div className="relative rounded-lg overflow-hidden my-1 group max-w-[280px] bg-slate-900/10 dark:bg-black/20">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-44 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
            onClick={(e) => {
              e.stopPropagation();
              setIsPreviewOpen(true);
            }}
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPreviewOpen(true);
              }}
              className="p-1.5 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow transition-transform hover:scale-110 cursor-pointer"
              title="Preview image"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white text-[11px] truncate">
            {attachment.name}
          </div>
        </div>
      ) : (
        <div
          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors my-1 max-w-[280px] ${
            isOwn
              ? 'bg-emerald-700/15 border-emerald-400/30 text-emerald-950 dark:text-emerald-100'
              : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-[#009966] dark:text-emerald-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate leading-tight">{attachment.name}</p>
            <p className="text-[10px] opacity-75 font-mono tabular-nums">{attachment.size || 'PDF Document'}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPreviewOpen(true);
            }}
            className="p-1 text-slate-400 hover:text-[#009966] dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
            title="View document"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Render modal into document.body */}
      {typeof document !== 'undefined' && modalContent && createPortal(modalContent, document.body)}
    </>
  );
};
