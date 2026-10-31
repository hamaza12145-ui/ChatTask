import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceNotePlayerProps {
  duration?: number; // seconds
  isOwn?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  duration = 16,
  isOwn = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Mock bar heights for waveform
  const bars = [35, 60, 40, 80, 95, 45, 70, 85, 30, 60, 90, 75, 50, 65, 80, 40, 70, 55, 30, 45];

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="flex items-center gap-3 py-1 min-w-[200px] max-w-[260px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
          isOwn
            ? 'bg-indigo-700 text-white hover:bg-indigo-800'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500'
        }`}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center">
        {/* Animated Waveform */}
        <div className="flex items-center gap-[2px] h-6">
          {bars.map((height, i) => {
            const barProgress = (i / bars.length) * duration;
            const hasPlayed = barProgress <= progress;

            return (
              <div
                key={i}
                style={{ height: `${height}%` }}
                className={`w-[3px] rounded-full transition-colors duration-200 ${
                  hasPlayed
                    ? isOwn
                      ? 'bg-indigo-800 dark:bg-white'
                      : 'bg-indigo-600 dark:bg-indigo-400'
                    : isOwn
                    ? 'bg-indigo-300 dark:bg-indigo-700'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Time display */}
        <div className="flex justify-between items-center text-[10px] font-mono tabular-nums opacity-75 mt-0.5">
          <span>{isPlaying ? formatTime(progress) : formatTime(duration)}</span>
          <span className="text-[9px]">Voice note</span>
        </div>
      </div>
    </div>
  );
};
