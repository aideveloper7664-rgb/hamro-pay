import React from 'react';

interface BrandIconProps {
  className?: string;
  variant?: 'brand' | 'mono';
}

export function FamPayIcon({ className = 'w-4 h-4', variant = 'brand' }: BrandIconProps) {
  const gradId = React.useId();

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {variant === 'brand' && (
        <defs>
          <linearGradient id={gradId} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFC700" />
            <stop offset="55%" stopColor="#FF8A00" />
            <stop offset="100%" stopColor="#FF4D00" />
          </linearGradient>
        </defs>
      )}
      {/* Stylized bold slanted FamPay 'F' mark with notched terminal */}
      <path
        d="M7.2 3.5H19.6L18.1 7.6H11.1L10.3 10.4H16.6L15.2 14.3H9.2L7.5 20.5H3.3L7.2 3.5Z"
        fill={variant === 'brand' ? `url(#${gradId})` : 'currentColor'}
      />
      {/* Signature diagonal accent notch */}
      <path
        d="M15.8 10.4L19.4 10.4L17.9 14.3H14.4L15.8 10.4Z"
        fill={variant === 'brand' ? '#FFE27A' : 'currentColor'}
        opacity={variant === 'brand' ? 0.95 : 0.75}
      />
    </svg>
  );
}

export function PaytmIcon({ className = 'w-4 h-4', variant = 'brand' }: BrandIconProps) {
  const navy = variant === 'brand' ? '#002970' : 'currentColor';
  const cyan = variant === 'brand' ? '#00BAF2' : 'currentColor';

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Bold geometric Paytm 'P' stem & bowl in Paytm Navy */}
      <path
        d="M5.5 3.5H13.4C16.7 3.5 19 5.5 19 8.6C19 11.7 16.7 13.7 13.4 13.7H9.6V17.4H5.5V3.5ZM9.6 7V10.3H12.9C14.1 10.3 14.9 9.6 14.9 8.65C14.9 7.65 14.1 7 12.9 7H9.6Z"
        fill={navy}
      />
      {/* Paytm Cyan signature accent ribbon & underline */}
      <path
        d="M14.2 15.6H19.5C19.5 17.9 17.5 20.3 13.2 20.5H5.5V18.4H12.9C14.6 18.4 15.5 17.4 14.2 15.6Z"
        fill={cyan}
      />
      <circle cx="17.2" cy="15.8" r="1.5" fill={cyan} opacity={variant === 'brand' ? 1 : 0.85} />
    </svg>
  );
}

export function AmazonPayIcon({ className = 'w-4 h-4', variant = 'brand' }: BrandIconProps) {
  const letterColor = variant === 'brand' ? '#FFFFFF' : 'currentColor';
  const smileColor = variant === 'brand' ? '#FF9900' : 'currentColor';

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Amazon lowercase 'a' */}
      <path
        d="M14.2 12.9C14.2 13.9 13.3 14.6 12.1 14.6C11.1 14.6 10.5 14.1 10.5 13.3C10.5 12.1 11.8 11.7 14.2 11.6V12.9ZM17.1 15.2C16.9 14.9 16.8 14.5 16.8 13.8V9.4C16.8 7 15.3 5.5 12.2 5.5C9.8 5.5 8.1 6.5 7.6 8.3L10.2 8.7C10.5 7.8 11.2 7.4 12.2 7.4C13.5 7.4 14.2 8 14.2 9.2V9.8C10.4 10 7.6 10.9 7.6 13.6C7.6 15.5 9.1 16.7 11.2 16.7C12.7 16.7 13.8 16.1 14.5 15.1L15 16.3H17.6C17.4 15.9 17.2 15.5 17.1 15.2Z"
        fill={letterColor}
      />
      {/* Signature Amazon smile arrow */}
      <path
        d="M4.2 17.7C7.6 20.2 12.9 20.8 17.6 18.8C18.1 18.6 18.5 19.1 18.1 19.5C13.5 22.1 7.6 21.6 3.7 18.4C3.4 18.1 3.8 17.4 4.2 17.7Z"
        fill={smileColor}
      />
      <path
        d="M16.8 17.2C17.9 17.1 19.5 17 20.1 17.6C20.6 18.2 19.9 19.9 19.2 20.7C19 21 18.7 20.8 18.8 20.4C19.1 19.7 19.4 18.6 19.1 18.2C18.8 17.8 17.6 17.9 16.9 18C16.5 18 16.4 17.3 16.8 17.2Z"
        fill={smileColor}
      />
    </svg>
  );
}
