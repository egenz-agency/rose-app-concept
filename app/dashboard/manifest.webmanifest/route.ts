// Manifest for the OWNER's installed app.
//
// Separate from the root manifest (start_url "/") and from each gift's manifest
// (start_url "/g/<token>"), because installing from the dashboard should reopen
// the dashboard — not the sign-in page, and certainly not the recipient's gift.
//
// `id` is set explicitly so the browser treats this as a distinct installable
// app from a gift on the same origin. Without it, installing one can be
// mistaken for the other since they share a scope.
//
// No secrets here — unlike the gift manifest, nothing in this is token-bearing,
// so it needs no auth.
export async function GET() {
  const manifest = {
    id: "/dashboard",
    name: "Your Rose — Owner",
    short_name: "Your Rose",
    description: "Write messages, add moments and manage the gift you made.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0205",
    theme_color: "#0a0205",
    categories: ["lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
