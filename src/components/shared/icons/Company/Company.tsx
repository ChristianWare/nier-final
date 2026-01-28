// src/icons/Company/Company.tsx
import { SVGProps } from "react";

export default function Company(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-circle-check-icon lucide-circle-check'
      {...props}
    >
      <path d='M10 12h4' />
      <path d='M10 8h4' />
      <path d='M14 21v-3a2 2 0 0 0-4 0v3' />
      <path d='M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2' />
      <path d='M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16' />
    </svg>
  );
}
