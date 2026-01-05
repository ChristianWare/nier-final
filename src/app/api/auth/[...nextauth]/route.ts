// app/api/auth/[...nextauth]/route.ts
import { handlers } from "../../../../../auth";

// Optional (but safe): ensure this route uses the Node.js runtime
export const runtime = "nodejs";

export const { GET, POST } = handlers;
