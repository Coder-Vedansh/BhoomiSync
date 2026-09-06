import React from 'react';
import { Search } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-[#4F574D] mb-1.5">{label}</label>}
      <div className="relative flex items-center">
        {icon && <div className="absolute left-3 text-[#858B82] pointer-events-none">{icon}</div>}
        <input
          className={`input ${icon ? 'pl-10' : ''} ${error ? 'border-[#914B38] focus:border-[#914B38]' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-[#914B38] mt-1 block">{error}</span>}
    </div>
  );
};

export const SearchInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & {
  onSearchChange?: (val: string) => void;
}> = ({ placeholder = 'Search...', className = '', onSearchChange, onChange, ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onSearchChange?.(e.target.value);
  };

  return (
    <Input
      icon={<Search size={15} />}
      placeholder={placeholder}
      className={className}
      onChange={handleChange}
      {...props}
    />
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  children,
  error,
  className = '',
  ...props
}) => {
  const isWidthConstrained = className.includes('w-');
  return (
    <div className={isWidthConstrained ? 'flex-shrink-0' : 'w-full'}>
      {label && <label className="block text-xs font-semibold text-[#4F574D] mb-1.5">{label}</label>}
      <select className={`select ${className}`} {...props}>
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && <span className="text-xs text-[#914B38] mt-1 block">{error}</span>}
    </div>
  );
};

export default Input;
