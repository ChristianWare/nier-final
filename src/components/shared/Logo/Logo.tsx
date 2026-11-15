// src/icons/Logo/Logo.tsx
import { SVGProps } from "react";

export default function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 1111 996'
      width='1em'
      height='1em'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
      focusable='false'
      {...props}
    >
      {/* The N, and the arrow off its top right */}
      <path d='M0 98H269L912 741V995H723L292 553V995H0Z' />
      <path d='M583 98H898V0L1110 210L898 437V319H583Z' />
    </svg>
  );
}
