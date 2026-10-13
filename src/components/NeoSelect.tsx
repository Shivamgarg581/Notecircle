import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface NeoSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface NeoSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: NeoSelectOption[];
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

export const NeoSelect: React.FC<NeoSelectProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  size = 'md',
  ariaLabel
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] select-none flex items-center justify-between"
        >
          <span>{label}</span>
        </label>
      )}

      {/* Modern Florum-Style Select */}
      <div 
        className={`relative w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.10] bg-[#FAF8F5] dark:bg-[#1E2421] transition-all hover:border-black/[0.16] dark:hover:border-white/[0.20] focus-within:ring-2 focus-within:ring-emerald-600/30 focus-within:border-emerald-600 ${
          disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
        }`}
      >
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={ariaLabel || label}
          className={`w-full appearance-none bg-transparent font-medium text-[#191D1A] dark:text-[#F5F7F5] cursor-pointer outline-none border-0 ${
            size === 'sm' ? 'py-2 pl-3 pr-9 text-xs' : 'py-2.5 pl-3.5 pr-10 text-xs sm:text-sm'
          }`}
        >
          {options.map((opt) => (
            <option 
              key={opt.value} 
              value={opt.value} 
              className="bg-white dark:bg-[#181C1A] text-[#191D1A] dark:text-[#F5F7F5]"
            >
              {opt.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#8A968F]">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
