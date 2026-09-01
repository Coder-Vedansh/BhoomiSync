import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'cyan' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    cyan: 'btn-cyan',
    danger: 'btn-danger',
    outline: 'btn-outline',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white',
  }[variant];

  const sizeClass = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  }[size];

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={size === 'sm' ? 12 : 16} className="animate-spin" />}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
};

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  variant?: 'secondary' | 'ghost' | 'outline' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}> = ({ icon, variant = 'secondary', size = 'md', tooltip, className = '', ...props }) => {
  const padClass = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-2.5 text-base',
  }[size];

  return (
    <button
      title={tooltip}
      className={`btn ${variant === 'primary' ? 'btn-primary' : variant === 'outline' ? 'btn-outline' : variant === 'ghost' ? 'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white' : 'btn-secondary'} ${padClass} rounded-lg ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
