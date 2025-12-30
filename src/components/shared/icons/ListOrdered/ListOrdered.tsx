import React from "react";
import { SVGProps } from "react";



export default function ListOrdered(props: SVGProps<SVGSVGElement>) {
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
      <path d='M11 5h10' />
      <path d='M11 12h10' />
      <path d='M11 19h10' />
      <path d='M4 4h1v5' />
      <path d='M4 9h2' />
      <path d='M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02' />
    </svg>
  );
}
