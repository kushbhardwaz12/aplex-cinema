import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  title?: string;
}

/**
 * Official Maxhub4u '4U' App Logo Component
 * Rendered using precision SVG matching the brand emblem
 */
export const Logo: React.FC<LogoProps> = ({ 
  className = "w-9 h-9", 
  size,
  title = "Maxhub4u Logo" 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 500 500" 
      width={size || "100%"} 
      height={size || "100%"}
      className={className}
      aria-label={title}
    >
      <defs>
        <radialGradient id="logoBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#17171a" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </radialGradient>
      </defs>

      {/* Background Rounded Squircle Rectangle */}
      <rect 
        x="25" 
        y="25" 
        width="450" 
        height="450" 
        rx="95" 
        ry="95" 
        fill="url(#logoBgGlow)" 
        stroke="#222226" 
        strokeWidth="3" 
      />
      
      <g id="logo-emblem">
        {/* White Letter 'U' (Base layer so Red '4' crossbar overlaps cleanly) */}
        <path 
          d="M 250 162 
             L 308 162 
             L 308 275 
             C 308 293 322 307 340 307 
             C 358 307 372 293 372 275 
             L 372 162 
             L 430 162 
             L 430 275 
             C 430 325 390 338 340 338 
             C 290 338 250 325 250 275 
             Z" 
          fill="#ffffff" 
        />

        {/* Red Number '4' with Overlapping Dynamic Angled Crossbar */}
        <path 
          d="M 233 162 
             L 175 162 
             L 70 268 
             L 70 300 
             L 175 300 
             L 175 338 
             L 233 338 
             L 233 300 
             L 270 300 
             L 258 268 
             L 233 268 
             L 233 162 Z 
             M 175 220 
             L 175 268 
             L 128 268 Z" 
          fill="#ff0f39" 
        />
      </g>
    </svg>
  );
};

export default Logo;
