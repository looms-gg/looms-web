/**
 * Pure helpers for the OG worker, split from worker.ts so they are testable
 * without pulling in satori, resvg-wasm, the bundled .wasm module, or the
 * Nunito font data. Everything here is deterministic and runtime-free.
 */

export const SLOT_LABELS: Record<string, string> = {
  eyes: "EYES",
  hair: "HAIR",
  hat: "HEADWEAR",
  face: "FACE ACCESSORY",
  shirt: "SHIRT & TOP",
  coat: "OUTERWEAR",
  pants: "BOTTOMS",
  shoes: "FOOTWEAR",
  set: "OUTFIT SET",
}

export function slotLabel(slot: string): string {
  return SLOT_LABELS[slot] ?? slot.toUpperCase()
}

export function sanitizeText(input: string | null | undefined, maxLength: number): string {
  let text = String(input ?? "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, "")
    .trim()
  if (text.length > maxLength) text = text.slice(0, maxLength).trimEnd()
  return text
}

export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars).trimEnd()}…`
}

export type OgRoute =
  | { kind: "piece" | "look"; id: string }
  | { kind: "default" }
  | { kind: "not-found" }

/** Map an OG request pathname to the route it targets. */
export function parseOgPath(pathname: string): OgRoute {
  const match = pathname.match(/^\/og\/(piece|look)\/([a-zA-Z0-9_-]+)\.png$/)
  if (match) {
    return { kind: match[1] as "piece" | "look", id: match[2] }
  }
  if (pathname === "/og/default.png") {
    return { kind: "default" }
  }
  return { kind: "not-found" }
}

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

// DESIGN.md tokens
export const OG_COLORS = {
  VOID: "#121214",
  HOME: "#1a1a1e",
  LINE: "#3e3e44",
  INK: "#ececec",
  MUTED: "#9a9aa3",
  CYAN: "#0ab9f0",
} as const

export interface CardElementOpts {
  title: string
  subtitle: string
  creatorIsCyan: boolean
  badge: string
  badge2?: string
  description: string
  footer: string
  wash: string
  imageUrl?: string
}

export function cardElement(opts: CardElementOpts) {
  const { title, subtitle, creatorIsCyan, badge, badge2, description, footer, wash, imageUrl } = opts
  const { VOID, HOME, LINE, INK, MUTED, CYAN } = OG_COLORS
  return {
    type: "div",
    props: {
      style: {
        width: `${OG_WIDTH}px`,
        height: `${OG_HEIGHT}px`,
        display: "flex",
        position: "relative",
        background: VOID,
        fontFamily: "Nunito",
        color: INK,
      },
      children: [
        // wash discs
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              right: "-180px",
              top: "-180px",
              width: "760px",
              height: "760px",
              borderRadius: "380px",
              background: `radial-gradient(circle, ${wash}22 0%, transparent 70%)`,
            },
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              left: "-240px",
              bottom: "-240px",
              width: "560px",
              height: "560px",
              borderRadius: "280px",
              background: `radial-gradient(circle, ${wash}14 0%, transparent 70%)`,
            },
          },
        },
        // left column
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              width: "640px",
              padding: "64px 0 0 72px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", gap: "12px", alignItems: "center" },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          padding: "9px 18px",
                          borderRadius: "999px",
                          background: `${CYAN}1a`,
                          color: CYAN,
                          border: `1px solid ${CYAN}55`,
                          fontSize: "16px",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        },
                        children: badge,
                      },
                    },
                    ...(badge2
                      ? [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                padding: "9px 18px",
                                borderRadius: "999px",
                                background: HOME,
                                color: MUTED,
                                border: `1px solid ${LINE}`,
                                fontSize: "16px",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                              },
                              children: badge2,
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: { marginTop: "22px", fontSize: "56px", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", color: INK },
                  children: truncate(title, 22),
                },
              },
              {
                type: "div",
                props: {
                  style: { marginTop: "14px", fontSize: "26px", fontWeight: 700, color: creatorIsCyan ? CYAN : MUTED },
                  children: subtitle,
                },
              },
              {
                type: "div",
                props: {
                  style: { marginTop: "22px", fontSize: "23px", fontWeight: 400, lineHeight: 1.55, color: MUTED, maxWidth: "540px" },
                  children: truncate(description, 140),
                },
              },
              {
                type: "div",
                props: {
                  style: { marginTop: "auto", paddingBottom: "56px", display: "flex", flexDirection: "column", gap: "14px", width: "488px" },
                  children: [
                    { type: "div", props: { style: { width: "100%", height: "1px", background: LINE } } },
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", alignItems: "center", gap: "12px", fontSize: "18px", fontWeight: 700, color: MUTED },
                        children: [
                          { type: "div", props: { style: { width: "12px", height: "12px", borderRadius: "6px", background: CYAN } } },
                          footer,
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // right stage tile
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              right: "64px",
              top: "64px",
              width: "480px",
              height: "502px",
              borderRadius: "18px",
              background: HOME,
              border: `1px solid ${LINE}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
            children: imageUrl
              ? [
                  {
                    type: "img",
                    props: {
                      src: imageUrl,
                      width: "340",
                      height: "340",
                      style: { objectFit: "contain" },
                    },
                  },
                ]
              : [],
          },
        },
      ],
    },
  }
}

/**
 * Returns the fallback HTTP Response when content cannot be resolved or rendered.
 * Missing piece or look IDs redirect to the default card; unknown paths 404.
 */
export function fallbackResponse(route: OgRoute, origin: string): Response {
  if (route.kind === "piece" || route.kind === "look") {
    return Response.redirect(`${origin}/og/default.png`, 302)
  }
  return new Response("Not found", { status: 404 })
}

