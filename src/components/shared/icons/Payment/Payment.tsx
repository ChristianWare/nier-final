// src/icons/Payment/Payment.tsx
import { SVGProps } from "react";

export default function Payment(props: SVGProps<SVGSVGElement>) {
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
      xmlns='http://www.w3.org/2000/svg'
      {...props} // allows overriding size, className, etc.
    >
      <rect x={3} y={6} width={18} height={13} rx={2} />
      <path d='M3 10H20.5' />
      <path d='M7 15H9' />
    </svg>
  );
}
