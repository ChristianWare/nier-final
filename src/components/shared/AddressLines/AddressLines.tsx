// An address on separate lines (place, street, city), as on an envelope.
// See formatAddressLines. Works in server and client components.

import { formatAddressLines } from "@/lib/formatAddress";

export default function AddressLines({
  address,
  className,
}: {
  address: string | null | undefined;
  className?: string;
}) {
  const lines = formatAddressLines(address);
  return (
    <span className={className} style={{ display: "block" }}>
      {lines.map((line, i) => (
        <span key={i} style={{ display: "block" }}>
          {line}
        </span>
      ))}
    </span>
  );
}
