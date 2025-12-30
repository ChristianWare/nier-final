// src/icons/FnfLogo/FnfLogo.tsx
import { SVGProps } from "react";

export default function FnfLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24' // ← as requested
      width='1em'
      height='1em'
      xmlns='http://www.w3.org/2000/svg'
      fill='currentColor'
      aria-hidden='true'
      focusable='false'
      {...props}
    >
      {/* Scaled & centered to fit a 24×24 box */}
      <g transform='translate(5.18 0.42) scale(0.18) translate(-149.598 -123.188)'>
        <path d='M150.836 229.176 182.117 251.812 182.117 212.824Z' />
        <path d='M149.598 222.527 225.395 182.906 225.395 156.914 149.598 196.504Z' />
        <path d='M149.598 188.676 225.395 149.086 225.395 123.188 149.598 162.777Z' />
        <circle cx='168.070312' cy='200.949219' r='6.929687' />
      </g>
    </svg>
  );
}
