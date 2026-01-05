const BRAND = process.env.BRAND_NAME || "Nier Transportation";

function money(cents: number, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export function paymentLinkHtml(params: {
  name?: string | null;
  pickupAtISO: string;
  pickupAddress: string;
  dropoffAddress: string;
  totalCents: number;
  currency: string;
  payUrl: string;
  bookingId: string;
}) {
  const ink = "#0f1720";
  const sand = "#f4efe7";
  const blue = "#2563eb";

  return `
  <div style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; background:${sand}; padding:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(0,0,0,.08)">
      <tr>
        <td style="background:${blue}; color:#fff; padding:22px 24px">
          <div style="font-size:14px; letter-spacing:.08em; text-transform:uppercase; opacity:.95">Payment link</div>
          <div style="font-size:22px; font-weight:700; margin-top:4px">${BRAND}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px; color:${ink}; font-size:16px; line-height:1.6">
          <p style="margin:0 0 10px;">${params.name ? `${params.name}, ` : ""}your booking is ready for payment.</p>

          <div style="margin:14px 0; padding:14px; border:1px solid rgba(0,0,0,.08); border-radius:14px;">
            <div style="font-size:12px; opacity:.75; margin-bottom:6px;">Booking</div>
            <div style="font-weight:700;">${money(params.totalCents, params.currency)}</div>
            <div style="margin-top:10px; font-size:14px; opacity:.9;">
              <div><strong>Pickup:</strong> ${params.pickupAddress}</div>
              <div><strong>Dropoff:</strong> ${params.dropoffAddress}</div>
              <div><strong>Pickup time:</strong> ${params.pickupAtISO}</div>
              <div style="font-size:12px; opacity:.65; margin-top:6px;">Booking ID: ${params.bookingId}</div>
            </div>
          </div>

          <a href="${params.payUrl}"
             style="display:inline-block; background:${blue}; color:#fff; text-decoration:none; padding:12px 16px; border-radius:12px; font-weight:700;">
            Pay now
          </a>

          <p style="margin:14px 0 0; font-size:12px; opacity:.75;">
            If the button doesn’t work, copy/paste this link:<br/>
            <span style="word-break:break-all;">${params.payUrl}</span>
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#fafafa; padding:14px 24px; font-size:12px; color:#6b7280">
          © ${new Date().getFullYear()} ${BRAND}.
        </td>
      </tr>
    </table>
  </div>`;
}

export function paymentLinkText(params: {
  name?: string | null;
  pickupAtISO: string;
  pickupAddress: string;
  dropoffAddress: string;
  totalCents: number;
  currency: string;
  payUrl: string;
  bookingId: string;
}) {
  const m = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const hello = params.name ? `${params.name}, ` : "";
  return [
    `Payment link — ${BRAND}`,
    ``,
    `${hello}your booking is ready for payment.`,
    ``,
    `Amount: ${m(params.totalCents)} (${params.currency.toUpperCase()})`,
    `Pickup: ${params.pickupAddress}`,
    `Dropoff: ${params.dropoffAddress}`,
    `Pickup time: ${params.pickupAtISO}`,
    `Booking ID: ${params.bookingId}`,
    ``,
    `Pay here: ${params.payUrl}`,
  ].join("\n");
}
