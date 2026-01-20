// src/icons/Listing/Listing.tsx
import { SVGProps } from "react";

export default function Listing(props: SVGProps<SVGSVGElement>) {
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
      <path d='M8 8H20M11 12H20M14 16H20M4 8H4.01M7 12H7.01M10 16H10.01' />
    </svg>
  );
}
