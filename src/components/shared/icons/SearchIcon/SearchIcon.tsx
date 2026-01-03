// src/icons/SearchIcon/SearchIcon.tsx
import { SVGProps } from "react";

export default function SearchIcon(props: SVGProps<SVGSVGElement>) {
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
      className='lucide lucide-search-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='m21 21-4.34-4.34' />
      <circle cx={11} cy={11} r={8} />
    </svg>
  );
}
