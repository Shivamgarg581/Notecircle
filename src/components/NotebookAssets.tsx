import React from 'react';

// 1. Animated / Tactile 'N' Logo Mark & Notebook Reveal
export const NotebookLogoBadge: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const dimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  }[size];

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl bg-[#FFCA05] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] transition-transform group-hover:scale-105 ${dimensions} ${className}`}
      aria-hidden="true"
    >
      {/* Notebook Spine Spiral Rings */}
      <div className="absolute left-1 top-1 bottom-1 flex flex-col justify-between py-1 pointer-events-none">
        <span className="w-1.5 h-1 bg-[#111111] rounded-full" />
        <span className="w-1.5 h-1 bg-[#111111] rounded-full" />
        <span className="w-1.5 h-1 bg-[#111111] rounded-full" />
      </div>

      {/* Confident Hand-drawn 'N' Mark with paper fold */}
      <svg 
        viewBox="0 0 32 32" 
        className="w-3/5 h-3/5 text-[#111111] fill-current ml-1"
      >
        <path 
          d="M7 6h3.5l10.5 14V6h4v20h-3.5L10.5 12v14H7V6z" 
          stroke="#111111" 
          strokeWidth="1.2" 
          strokeLinejoin="round" 
        />
        {/* Subtle corner fold accent */}
        <polygon points="21,6 25,6 25,10" fill="#FAF7F0" opacity="0.6" />
      </svg>
    </div>
  );
};

// 2. Washi-Tape Header Sticker for Note Cards
export const WashiTape: React.FC<{ 
  color?: 'yellow' | 'mint' | 'coral' | 'sky' | 'paper';
  className?: string;
  label?: string;
}> = ({ 
  color = 'yellow', 
  className = '', 
  label 
}) => {
  const colorStyles = {
    yellow: 'bg-[#FFCA05]/90 text-[#111111] border-[#111111]',
    mint: 'bg-[#D8F3DC]/90 text-[#111111] border-[#111111]',
    coral: 'bg-[#FF6B6B]/90 text-white border-[#111111]',
    sky: 'bg-[#4D96FF]/90 text-white border-[#111111]',
    paper: 'bg-[#FAF7F0]/90 text-[#111111] border-[#111111]'
  }[color];

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider border-2 shadow-[2px_2px_0px_#111111] -rotate-1 select-none ${colorStyles} ${className}`}
      style={{
        clipPath: 'polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%)'
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label && <span>{label}</span>}
    </div>
  );
};

// 3. Genuine Empty State Notebook Artwork
export const NotebookEmptyIllustration: React.FC<{ 
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}> = ({
  title = "Your notebook is waiting for its first note",
  description = "No notes have been shared in your trusted circle yet. Post a thought, link, or signal to start.",
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div className={`p-8 sm:p-10 text-center rounded-3xl bg-[#FAF7F0] dark:bg-[#1E1E24] border-2.5 border-[#111111] dark:border-[#3E3E4A] shadow-[5px_5px_0px_#111111] max-w-md mx-auto space-y-5 my-6 ${className}`}>
      {/* Hand-drawn open notebook + quill vector */}
      <div className="w-24 h-24 mx-auto bg-[#FFCA05] rounded-3xl border-2 border-[#111111] shadow-[3px_3px_0px_#111111] flex items-center justify-center p-3 relative transform -rotate-2">
        {/* Binder rings */}
        <div className="absolute top-2 left-2 right-2 flex justify-between">
          <span className="w-2 h-2 rounded-full bg-[#111111]" />
          <span className="w-2 h-2 rounded-full bg-[#111111]" />
          <span className="w-2 h-2 rounded-full bg-[#111111]" />
          <span className="w-2 h-2 rounded-full bg-[#111111]" />
        </div>
        
        <svg viewBox="0 0 48 48" className="w-14 h-14 text-[#111111] fill-none stroke-current stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
          {/* Notebook pages */}
          <path d="M10 14h28v24H10z" fill="#FAF7F0" />
          <line x1="16" y1="20" x2="32" y2="20" />
          <line x1="16" y1="26" x2="28" y2="26" />
          <line x1="16" y1="32" x2="24" y2="32" />
          {/* Feather Pen */}
          <path d="M38 10c-4 0-8 6-10 12l2 2c6-2 12-6 12-10 0-3-2-4-4-4z" fill="#FFCA05" />
          <line x1="28" y1="22" x2="22" y2="28" />
        </svg>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-black text-[#111111] dark:text-[#F5F2EB] tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-[#4A4742] dark:text-[#C8C5BE] leading-relaxed max-w-sm mx-auto font-medium">
          {description}
        </p>
      </div>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FFCA05] text-[#111111] border-2 border-[#111111] font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#111111] transition-all cursor-pointer"
        >
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};

// 4. Welcome Celebration Illustration
export const WelcomeCelebrationIllustration: React.FC<{ 
  username: string;
  onDismiss: () => void;
}> = ({ username, onDismiss }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#111111]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full rounded-3xl bg-[#FAF7F0] dark:bg-[#1E1E24] border-3 border-[#111111] dark:border-[#3E3E4A] shadow-[8px_8px_0px_#111111] p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
        {/* Decorative corner washi tape */}
        <div className="absolute -top-3 left-10">
          <WashiTape color="yellow" label="Account Ready" />
        </div>

        {/* Celebration Badge */}
        <div className="w-20 h-20 mx-auto bg-[#D8F3DC] rounded-3xl border-2.5 border-[#111111] shadow-[4px_4px_0px_#111111] flex items-center justify-center text-3xl rotate-3">
          🎉
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#111111] dark:text-[#F5F2EB] tracking-tight">
            Welcome to NoteCircle!
          </h2>
          <p className="text-sm font-semibold text-[#111111] dark:text-[#FFCA05]">
            @{username}
          </p>
          <p className="text-xs text-[#4A4742] dark:text-[#C8C5BE] leading-relaxed max-w-sm mx-auto">
            Your private encrypted notebook is activated. There are no public feeds or algorithms here—only notes and messages shared with your trusted circle.
          </p>
        </div>

        {/* Security seal badges */}
        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-bold text-[#111111] dark:text-[#F5F2EB]">
          <span className="px-2.5 py-1 rounded-xl bg-[#FAF7F0] dark:bg-[#16161B] border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
            🔒 Client E2EE
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-[#FAF7F0] dark:bg-[#16161B] border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
            ⏱️ Auto-Expiring
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-[#FAF7F0] dark:bg-[#16161B] border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
            🚫 Zero Public Feeds
          </span>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#FFCA05] text-[#111111] border-2.5 border-[#111111] font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#111111] transition-all cursor-pointer"
        >
          Open My Notebook
        </button>
      </div>
    </div>
  );
};

// 5. Stamp Badge for Cryptographic & Safety Verification
export const StampBadge: React.FC<{ 
  label: string; 
  variant?: 'green' | 'yellow' | 'coral' | 'blue';
  className?: string;
}> = ({ label, variant = 'yellow', className = '' }) => {
  const styles = {
    yellow: 'bg-[#FFCA05] text-[#111111]',
    green: 'bg-[#D8F3DC] text-[#111111]',
    coral: 'bg-[#FF6B6B] text-white',
    blue: 'bg-[#4D96FF] text-white'
  }[variant];

  return (
    <span 
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border-1.5 border-[#111111] text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#111111] select-none ${styles} ${className}`}
    >
      {label}
    </span>
  );
};
