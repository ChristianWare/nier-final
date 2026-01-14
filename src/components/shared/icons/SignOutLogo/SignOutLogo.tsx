// src/icons/SignOutLogo/SignOutLogo.tsx
import { SVGProps } from "react";

export default function SignOutLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      width='1em'
      height='1em'
      fill='none'
      stroke='currentColor'
      strokeWidth={4}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-log-out-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='m16 17 5-5-5-5' />
      <path d='M21 12H9' />
      <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
    </svg>
  );
}
