import { formatAddressLines } from "@/lib/formatAddress";

/**
 * The first line of an address, for tight spots like a list row: the
 * place's name when it has one ("Red Rock Casino Resort & Spa"), otherwise
 * the street ("8420 Desert Willow Ct").
 */
export function shortPlace(address: string | null | undefined): string {
  return formatAddressLines(address)[0] ?? "";
}
