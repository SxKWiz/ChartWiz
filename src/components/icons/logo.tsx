import * as React from 'react';

export function Logo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="hsl(var(--sidebar-primary))"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <rect
        x="8"
        y="10.5"
        width="8"
        height="3"
        rx="1.5"
        stroke="hsl(var(--sidebar-primary))"
        strokeWidth="1.5"
      />
    </svg>
  );
}
