// src/icons/Design/Design.tsx
import { SVGProps } from "react";

export default function Design(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      width='1em'
      height='1em'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props} // allows overriding size, className, etc.
    >
      <path
        d='M8 10L12 3L16 10H8Z'
        stroke='currentColor'
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M10 17.5C10 19.433 8.433 21 6.5 21C4.567 21 3 19.433 3 17.5C3 15.567 4.567 14 6.5 14C8.433 14 10 15.567 10 17.5Z'
        stroke='currentColor'
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M14 14H21V21H14V14Z'
        stroke='currentColor'
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
