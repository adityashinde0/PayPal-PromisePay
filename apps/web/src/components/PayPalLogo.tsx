import React from 'react';

interface PayPalLogoProps {
  className?: string;
  variant?: 'brand' | 'monogram';
  height?: number;
}

export function PayPalLogo({
  className = '',
  variant = 'brand',
  height = 22,
}: PayPalLogoProps) {
  if (variant === 'monogram') {
    return (
      <svg
        height={height}
        viewBox="0 0 32 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block ${className}`}
        aria-label="PayPal"
      >
        <path
          d="M24.717 6.477C24.037 3.52 21.848 1.48 17.75 1.48H7.31c-.9 0-1.65.65-1.78 1.54L1.75 27.69c-.1.7.45 1.31 1.16 1.31h6.08l1.64-10.41-.05.33c.13-.89.88-1.54 1.78-1.54h3.69c6.43 0 11.45-2.61 12.92-10.15.02-.12.04-.23.06-.34-.34-.14-.7-.27-1.07-.38-.72-.22-1.55-.38-2.52-.48z"
          fill="#003087"
        />
        <path
          d="M27.27 10.93c-1.47 7.54-6.49 10.15-12.92 10.15h-3.69c-.9 0-1.65.65-1.78 1.54L6.96 35.12c-.08.57.36 1.07.93 1.07h5.12c.79 0 1.45-.57 1.56-1.35l1.24-7.85.08-.49c.11-.78.77-1.35 1.56-1.35h1.22c5.62 0 10.02-2.28 11.3-8.88.54-2.76.24-5.08-.85-6.72-.45.71-1.05 1.35-1.85 1.88z"
          fill="#0070BA"
        />
        <path
          d="M24.717 6.477C23.94 10.45 20.35 12.7 15.35 12.7h-3.69c-.9 0-1.65.65-1.78 1.54l-1.07 6.79 1.64-10.41-.05.33c.13-.89.88-1.54 1.78-1.54h3.69c6.43 0 11.45-2.61 12.92-10.15.02-.12.04-.23.06-.34-.34-.14-.7-.27-1.07-.38-.72-.22-1.55-.38-2.52-.48z"
          fill="#002766"
          opacity="0.35"
        />
      </svg>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Official PayPal Monogram */}
      <svg
        height={height}
        viewBox="0 0 32 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="PayPal"
      >
        <path
          d="M24.717 6.477C24.037 3.52 21.848 1.48 17.75 1.48H7.31c-.9 0-1.65.65-1.78 1.54L1.75 27.69c-.1.7.45 1.31 1.16 1.31h6.08l1.64-10.41-.05.33c.13-.89.88-1.54 1.78-1.54h3.69c6.43 0 11.45-2.61 12.92-10.15.02-.12.04-.23.06-.34-.34-.14-.7-.27-1.07-.38-.72-.22-1.55-.38-2.52-.48z"
          fill="#003087"
        />
        <path
          d="M27.27 10.93c-1.47 7.54-6.49 10.15-12.92 10.15h-3.69c-.9 0-1.65.65-1.78 1.54L6.96 35.12c-.08.57.36 1.07.93 1.07h5.12c.79 0 1.45-.57 1.56-1.35l1.24-7.85.08-.49c.11-.78.77-1.35 1.56-1.35h1.22c5.62 0 10.02-2.28 11.3-8.88.54-2.76.24-5.08-.85-6.72-.45.71-1.05 1.35-1.85 1.88z"
          fill="#0070BA"
        />
        <path
          d="M24.717 6.477C23.94 10.45 20.35 12.7 15.35 12.7h-3.69c-.9 0-1.65.65-1.78 1.54l-1.07 6.79 1.64-10.41-.05.33c.13-.89.88-1.54 1.78-1.54h3.69c6.43 0 11.45-2.61 12.92-10.15.02-.12.04-.23.06-.34-.34-.14-.7-.27-1.07-.38-.72-.22-1.55-.38-2.52-.48z"
          fill="#002766"
          opacity="0.35"
        />
      </svg>

      {/* Brand Wordmark: PayPal PromisePay */}
      <div className="flex items-baseline">
        <span className="font-extrabold italic tracking-tight text-[#003087] text-lg">
          Pay
        </span>
        <span className="font-extrabold italic tracking-tight text-[#0070BA] text-lg">
          Pal
        </span>
        <span className="ml-1.5 font-bold tracking-tight text-slate-900 text-lg">
          Promise<span className="text-[#0070BA]">Pay</span>
        </span>
      </div>
    </div>
  );
}
