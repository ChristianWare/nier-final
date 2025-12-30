import { SVGProps } from "react";

export default function Instagram(props: SVGProps<SVGSVGElement>) {
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
      className='lucide lucide-instagram-icon'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <rect x={2} y={2} width={20} height={20} rx={5} ry={5} />
      <path d='M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' />
      <line x1={17.5} y1={6.5} x2={17.51} y2={6.5} />
    </svg>
  );
}
