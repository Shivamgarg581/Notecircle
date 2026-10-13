import React, { useState } from 'react';

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isOnline?: boolean;
}

const SIZES = {
  xs: 'w-6 h-6 text-[10px] font-semibold',
  sm: 'w-8 h-8 text-xs font-semibold',
  md: 'w-10 h-10 text-sm font-semibold',
  lg: 'w-14 h-14 text-base font-bold',
  xl: 'w-20 h-20 text-xl font-bold'
};

const COLOR_PALETTES = [
  'bg-gradient-to-br from-emerald-600 to-teal-700 text-white',
  'bg-gradient-to-br from-amber-600 to-orange-700 text-white',
  'bg-gradient-to-br from-teal-700 to-emerald-800 text-white',
  'bg-gradient-to-br from-stone-600 to-stone-800 text-white',
  'bg-gradient-to-br from-rose-600 to-rose-700 text-white',
  'bg-gradient-to-br from-cyan-700 to-blue-800 text-white'
];

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  isOnline = false
}) => {
  const [imgError, setImgError] = useState(false);

  // Derive stable initials
  const initials = (name || 'U')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Consistent color based on name
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = COLOR_PALETTES[Math.abs(hash) % COLOR_PALETTES.length];

  const onlineBadge = isOnline ? (
    <span 
      className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#181C1A] shadow-sm" 
      title="Online now"
    />
  ) : null;

  if (src && !imgError) {
    return (
      <div className={`relative inline-block shrink-0 ${SIZES[size]}`}>
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`w-full h-full rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10 shadow-sm ${className}`}
        />
        {onlineBadge}
      </div>
    );
  }

  return (
    <div className={`relative inline-block shrink-0 ${SIZES[size]}`}>
      <div
        className={`w-full h-full ${colorClass} rounded-full flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 shadow-sm select-none ${className}`}
        aria-label={name}
      >
        {initials}
      </div>
      {onlineBadge}
    </div>
  );
};
