// src/icons/SquareCircle/SquareCircle.tsx
import { SVGProps } from "react";

export default function SquareCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 480 480'
      width='1em'
      height='1em'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
      focusable='false'
      {...props}
    >
      <path d='M0 0h230c138 0 250 112 250 250v230H250C112 480 0 368 0 230V0Z' />
    </svg>
  );
}
