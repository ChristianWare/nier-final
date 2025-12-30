import { SVGProps } from "react";

export default function Email(props: SVGProps<SVGSVGElement>) {
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
      className='lucide lucide-mail-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7' />
      <rect x={2} y={4} width={20} height={16} rx={2} />
    </svg>
  );
}
