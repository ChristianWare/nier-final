import { SVGProps } from "react";

export default function Report(props: SVGProps<SVGSVGElement>) {
  return (
    // <svg
    //   viewBox='0 0 24 24'
    //   width='1em'
    //   height='1em'
    //   fill='none'
    //   stroke='currentColor'
    //   strokeWidth={2}
    //   strokeLinecap='round'
    //   strokeLinejoin='round'
    //   xmlns='http://www.w3.org/2000/svg'
    //   {...props}
    // >
    //   <path d='M3 3v16a2 2 0 0 0 2 2h16' />
    //   <path d='M7 16h8' />
    //   <path d='M7 11h12' />
    //   <path d='M7 6h3' />
    // </svg>
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='1em'
      height='1em'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-chart-line-icon lucide-chart-line'
      {...props}
    >
      <path d='M3 3v16a2 2 0 0 0 2 2h16' />
      <path d='m19 9-5 5-4-4-3 3' />
    </svg>
  );
}
