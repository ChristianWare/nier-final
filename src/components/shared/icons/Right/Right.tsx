// src/icons/Right/Right.tsx
import { SVGProps } from "react";

export default function Right(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      width='1em'
      height='1em'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-move-right-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='M18 8L22 12L18 16' />
      <path d='M2 12H22' />
    </svg>
  );
}
