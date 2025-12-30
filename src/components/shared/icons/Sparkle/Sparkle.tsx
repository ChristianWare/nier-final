// src/icons/Sparkle/Sparkle.tsx
import { SVGProps } from "react";

export default function Sparkle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 480 480'
      width='1em'
      height='1em'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
      focusable='false'
      {...props}
    >
      <path d='M480 240A240 240 0 0 1 240 0 240 240 0 0 1 0 240a240 240 0 0 1 240 240 240 240 0 0 1 240-240Z' />
    </svg>
  );
}
