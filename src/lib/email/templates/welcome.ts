const BRAND = process.env.BRAND_NAME || "Nier Transportation";

export function welcomeHtml(name?: string | null) {
  const sand = "#f4efe7";
  const ink = "#0f1720";
  const green = "#3fbf74";

  return `
  <div style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; background:${sand}; padding:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(0,0,0,.08)">
      <tr>
        <td style="background:${green}; color:#fff; padding:22px 24px">
          <div style="font-size:14px; letter-spacing:.08em; text-transform:uppercase; opacity:.95">Welcome</div>
          <div style="font-size:22px; font-weight:700; margin-top:4px">${BRAND}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px; color:${ink}; font-size:16px; line-height:1.6">
          <p style="margin:0 0 10px;">${name ? `${name}, ` : ""}thanks for creating an account!</p>
          <p style="margin:0 0 10px;">Your email is verified, and your dashboard is ready.</p>
          <p style="margin:0 0 16px;">From your account you can manage your plan, billing, and settings anytime.</p>
          <p style="margin:20px 0 0;">— The ${BRAND} team</p>
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

export function welcomeText(name?: string | null) {
  const hello = name ? `${name}, ` : "";
  return [
    `Welcome to ${BRAND}`,
    ``,
    `${hello}thanks for creating an account!`,
    `Your email is verified and your dashboard is ready.`,
    `Manage your plan, billing, and settings anytime from your account.`,
    ``,
    `— The ${BRAND} team`,
  ].join("\n");
}
