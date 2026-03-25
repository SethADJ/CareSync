import React from 'react';

interface LogoProps {
  /** tailwind classes to apply to the `<img>` element */
  className?: string;
  alt?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', alt = 'CareSync' }) => {
  return <img src="/logo.png" alt={alt} className={`object-contain ${className}`} />;
};