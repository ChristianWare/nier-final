// src/icons/Donut/Donut.tsx
import { SVGProps } from "react";

export default function Donut(props: SVGProps<SVGSVGElement>) {
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
      <path d='M240 0a240 240 0 1 0 0 480 240 240 0 0 0 0-480Zm0 360a120 120 0 1 1 0-240 120 120 0 0 1 0 240Z' />
    </svg>
  );
}
