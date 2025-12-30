// src/icons/Listing/Listing.tsx
import { SVGProps } from "react";

export default function Listing(props: SVGProps<SVGSVGElement>) {
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
      <path d='M8 8H20M11 12H20M14 16H20M4 8H4.01M7 12H7.01M10 16H10.01' />
    </svg>
  );
}
