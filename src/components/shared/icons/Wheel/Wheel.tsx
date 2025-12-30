// src/icons/Wheel/Wheel.tsx
import { SVGProps } from "react";

export default function Wheel(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      width='1em'
      height='1em'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-ship-wheel-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <circle cx={12} cy={12} r={8} />
      <path d='M12 2v7.5' />
      <path d='m19 5-5.23 5.23' />
      <path d='M22 12h-7.5' />
      <path d='m19 19-5.23-5.23' />
      <path d='M12 14.5V22' />
      <path d='M10.23 13.77 5 19' />
      <path d='M9.5 12H2' />
      <path d='M10.23 10.23 5 5' />
      <circle cx={12} cy={12} r={2.5} />
    </svg>
  );
}
