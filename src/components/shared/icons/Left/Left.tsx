// src/icons/Left/Left.tsx
import { SVGProps } from "react";

export default function Left(props: SVGProps<SVGSVGElement>) {
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
      className='lucide lucide-move-left-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props} // allows overriding size, className, etc.
    >
      <path d='M6 8L2 12L6 16' />
      <path d='M2 12H22' />
    </svg>
  );
}
