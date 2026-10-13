import React from 'react';
import { Check } from 'lucide-react';

export interface NeoCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const NeoCheckbox: React.FC<NeoCheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = ''
}) => {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-start gap-2.5 select-none cursor-pointer group ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
    >
      <div className="relative mt-0.5 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
            checked
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
              : 'bg-white dark:bg-[#1E2421] border-black/[0.15] dark:border-white/[0.15] text-transparent hover:border-emerald-600/50'
          }`}
        >
          <Check className={`w-3.5 h-3.5 stroke-[2.5] ${checked ? 'opacity-100' : 'opacity-0'}`} />
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-medium text-[#191D1A] dark:text-[#F5F7F5] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-[#8A968F] mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
};
