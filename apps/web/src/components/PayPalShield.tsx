import React from 'react';

interface PayPalShieldProps {
  size?: number;
  className?: string;
}

export function PayPalShield({ size = 120, className = '' }: PayPalShieldProps) {
  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size * 1.15 }}
    >
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full bg-cyan-400/25 blur-2xl animate-pulse" />

      {/* 3D Shield Vector */}
      <svg
        viewBox="0 0 120 138"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="10" y1="10" x2="110" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#0070BA" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#001A57" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="glassBorder" x1="0" y1="0" x2="120" y2="138" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#00D2FF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#003087" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="shieldFace" x1="20" y1="20" x2="100" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#001A57" stopOpacity="0.6" />
          </linearGradient>

          <filter id="shieldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Shield Shell */}
        <path
          d="M60 4L14 24V64C14 96.5 33.5 125 60 134C86.5 125 106 96.5 106 64V24L60 4Z"
          fill="url(#shieldGrad)"
          stroke="url(#glassBorder)"
          strokeWidth="3"
        />

        {/* Inner Glass Facet */}
        <path
          d="M60 14L22 30V64C22 91 38 114.5 60 122.5C82 114.5 98 91 98 64V30L60 14Z"
          fill="url(#shieldFace)"
          stroke="#00D2FF"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Centered PayPal 3D Monogram */}
        <g transform="translate(44, 45) scale(1.05)">
          {/* Back P */}
          <path
            d="M24.7 6.5C24 3.5 21.8 1.5 17.8 1.5H7.3C6.4 1.5 5.7 2.1 5.5 3L1.8 27.7C1.7 28.4 2.2 29 2.9 29H9l1.6-10.4-.1.3C10.6 18 11.4 17.4 12.3 17.4H16c6.4 0 11.5-2.6 12.9-10.2.1-.1.1-.2.1-.3-.3-.1-.7-.3-1.1-.4z"
            fill="#001A57"
          />
          {/* Front P */}
          <path
            d="M27.3 11C25.8 18.5 20.8 21.1 14.4 21.1h-3.7c-.9 0-1.6.6-1.8 1.5L7 35.1c-.1.6.4 1.1.9 1.1H13c.8 0 1.5-.6 1.6-1.4l1.2-7.8.1-.5c.1-.8.8-1.4 1.6-1.4h1.2c5.6 0 10-2.3 11.3-8.9.5-2.8.2-5.1-.9-6.7-.4.7-1 1.4-1.8 1.9z"
            fill="#FFFFFF"
          />
          {/* Cyan Glow Accent */}
          <path
            d="M27.3 11C25.8 18.5 20.8 21.1 14.4 21.1h-3.7c-.9 0-1.6.6-1.8 1.5L7 35.1c-.1.6.4 1.1.9 1.1H13c.8 0 1.5-.6 1.6-1.4l1.2-7.8.1-.5c.1-.8.8-1.4 1.6-1.4h1.2c5.6 0 10-2.3 11.3-8.9.5-2.8.2-5.1-.9-6.7-.4.7-1 1.4-1.8 1.9z"
            fill="#00D2FF"
            opacity="0.3"
          />
        </g>
      </svg>
    </div>
  );
}

