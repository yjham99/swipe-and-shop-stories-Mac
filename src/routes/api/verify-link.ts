import { createFileRoute } from "@tanstack/react-router";
import { verifyAffiliateLink } from "@/lib/pipeline";

// Mock verification endpoint: checks affiliate URL format only, no external calls.
export const Route = createFileRoute("/api/verify-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { url?: unknown };
        const url = typeof body.url === "string" ? body.url.slice(0, 500) : "";
        return Response.json({ valid: verifyAffiliateLink(url) });
      },
    },
  },
});
