import { SVGProps } from "react";

export default function Report(props: SVGProps<SVGSVGElement>) {
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
      <path d='M3 3v16a2 2 0 0 0 2 2h16' />
      <path d='m19 9-5 5-4-4-3 3' />
    </svg>
  );
}
