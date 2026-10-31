import React, { useState } from 'react';
import { TaskAttachment } from '../../types';
import { FileText, Download, Eye, ExternalLink, X, Image as ImageIcon } from 'lucide-react';

interface AttachmentPreviewProps {
  attachment: TaskAttachment;
  isOwn?: boolean;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachment, isOwn = false }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isImage = attachment.type === 'image';

  return (
    <>
      {isImage ? (
        <div className="relative rounded-lg overflow-hidden my-1 group max-w-[280px] bg-slate-900/10 dark:bg-black/20">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-44 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
            onClick={() => setIsPreviewOpen(true)}
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="p-1.5 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow transition-transform hover:scale-110"
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
              ? 'bg-indigo-700/20 border-indigo-400/30 text-indigo-950 dark:text-indigo-100'
              : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate leading-tight">{attachment.name}</p>
            <p className="text-[10px] opacity-75 font-mono tabular-nums">{attachment.size || 'PDF Document'}</p>
          </div>
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
            title="View document"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                {isImage ? (
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                ) : (
                  <FileText className="w-4 h-4 text-indigo-600" />
                )}
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {attachment.name}
                </span>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-50 dark:bg-slate-950 min-h-[300px]">
              {isImage ? (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-8 max-w-md">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
