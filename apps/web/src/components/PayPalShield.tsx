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

        {/* Official PayPal Monogram */}
        <g transform="translate(37, 42) scale(1.1)">
          {/* Base P – dark navy */}
          <path
            fill="#253B80"
            d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292A.563.563 0 0 1 5.035 1.1c.057-.049.13-.076.206-.076h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298c.443.235.795.504 1.065.812.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183-.482.809-1.096 1.48-1.825 2-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525-.399.344-.663.814-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125-.025.021-.061.035-.096.035H7.266z"
          />
          {/* Front P – sky blue */}
          <path
            fill="#179BD7"
            d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533c-.067.428.263.814.695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.492 4.492 0 0 0-1.336-1.03z"
          />
          {/* Overlap – deep navy */}
          <path
            fill="#FFFFFF"
            opacity="0.25"
            d="M21.754 7.151a9.52 9.52 0 0 0-.584-.15 10.52 10.52 0 0 0-.619-.117c-.742-.12-1.555-.177-2.426-.177h-7.352a.563.563 0 0 0-.507.115c-.339.162-.591.483-.652.876L8.05 17.605l-.045.289c.103-.652.66-1.132 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a5.65 5.65 0 0 0-1.017-.429 7.11 7.11 0 0 0-.277-.087z"
          />
        </g>
      </svg>
    </div>
  );
}

