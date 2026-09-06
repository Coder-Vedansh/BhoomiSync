import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'cyan' | 'danger' | 'outline' | 'ghost';
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
    accent: 'btn-accent',
    cyan: 'btn-cyan',
    danger: 'btn-danger',
    outline: 'btn-outline',
    ghost: 'bg-transparent text-[#5F665D] hover:bg-[#EEF2EC] hover:text-[#20251F]',
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
  variant?: 'secondary' | 'ghost' | 'outline' | 'primary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}> = ({ icon, variant = 'secondary', size = 'md', tooltip, className = '', ...props }) => {
  const padClass = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-2.5 text-base',
  }[size];

  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'accent'
      ? 'btn-accent'
      : variant === 'outline'
      ? 'btn-outline'
      : variant === 'ghost'
      ? 'bg-transparent hover:bg-[#EEF2EC] text-[#5F665D] hover:text-[#20251F]'
      : 'btn-secondary';

  return (
    <button
      title={tooltip}
      className={`btn ${variantClass} ${padClass} rounded-lg ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};

export default Button;
