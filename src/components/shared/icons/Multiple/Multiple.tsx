// src/icons/Multiple/Multiple.tsx
import { SVGProps } from "react";

export default function Multiple(props: SVGProps<SVGSVGElement>) {
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
        fill='none'
        stroke='currentColor'
        strokeWidth={2}
        d='M19,15 L23,15 L23,1 L9,1 L9,5 M15,19 L19,19 L19,5 L5,5 L5,9 M1,23 L15,23 L15,9 L1,9 L1,23 L1,23 L1,23 Z'
      />
    </svg>
  );
}
