// src/icons/DownloadIcon/DownloadIcon.tsx
import { SVGProps } from "react";

export default function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      width='1em'
      height='1em'
      fill='none'
      stroke='currentColor'
      strokeWidth={3}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-cloud-download-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='M12 13v8l-4-4' />
      <path d='m12 21 4-4' />
      <path d='M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284' />
    </svg>
  );
}
