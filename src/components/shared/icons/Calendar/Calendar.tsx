// src/icons/Calendar/Calendar.tsx
import { SVGProps } from "react";

export default function Calendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      width='1em'
      height='1em'
      fill='none'
      stroke='currentColor'
      strokeWidth={2.5}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-calendar-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props} // allows overriding size, className, etc.
    >
      <path d='M8 2v4' />
      <path d='M16 2v4' />
      <rect width={18} height={18} x={3} y={4} rx={2} />
      <path d='M3 10h18' />
    </svg>
  );
}
