const KV_KEY = "hackathon_winners";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Fetch current winners (defaults to unpublished / To Be Announced)
    if (url.pathname === "/api/winners" && request.method === "GET") {
      const stored = await env.WINNERS_KV.get(KV_KEY, { type: "json" });
      return Response.json(stored || { published: false, winners: [] });
    }

    // Push top 3 winners or reset back to TBA
    if (url.pathname === "/api/winners" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();

      if (!env.ADMIN_PASSWORD || token !== env.ADMIN_PASSWORD) {
        return Response.json({ error: "Invalid admin password" }, { status: 401 });
      }

      const body = await request.json();

      if (body.action === "reset") {
        const emptyState = { published: false, winners: [] };
        await env.WINNERS_KV.put(KV_KEY, JSON.stringify(emptyState));
        return Response.json({ ok: true, state: emptyState });
      }

      if (!Array.isArray(body.winners) || body.winners.length !== 3) {
        return Response.json({ error: "All 3 winners are required" }, { status: 400 });
      }

      const payload = {
        published: true,
        updatedAt: new Date().toISOString(),
        winners: body.winners.map((w, index) => ({
          rank: index + 1,
          name: String(w.name || "").trim(),
          college: String(w.college || "").trim(),
          prize: String(w.prize || "").trim(),
        })),
      };

      await env.WINNERS_KV.put(KV_KEY, JSON.stringify(payload));
      return Response.json({ ok: true, state: payload });
    }

    // Serve /, /winners, /winner-admin, CSS, JS, and logos
    return env.ASSETS.fetch(request);
  },
};
