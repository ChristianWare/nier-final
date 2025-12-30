// src/icons/Logo/Logo.tsx
import { SVGProps } from "react";

export default function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 375 375'
      width='1em'
      height='1em'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
      focusable='false'
      {...props}
    >
      <g transform='translate(0, 17)'>
        <g transform='translate(-2.621042, 333.185882)'>
          <path d='M 174.859375 -328.65625 L 356.59375 -120.296875 L 356.59375 0 L 205.796875 0 L 23.625 -213.09375 L 23.625 -328.65625 Z M 356.59375 -328.65625 L 356.59375 -161.53125 L 212.234375 -328.65625 Z M 23.625 -169.703125 L 168.40625 0 L 23.625 0 Z M 23.625 -169.703125' />
        </g>
      </g>
    </svg>
  );
}
