import { useEffect } from "react"
import { withBase } from "../../lib/basePath"

export type HeadMetaProps = {
  title?: string
  description?: string
  image?: string
  url?: string
  /** Set false to keep a route out of search indexes (auth-gated, private, reported). */
  index?: boolean
  /** JSON-LD structured data attached to the document head for this route. */
  jsonLd?: Record<string, unknown> | null
}

function updateMetaTag(selector: string, attr: string, value: string) {
  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement("meta")
    const [attrName, attrVal] = selector.replace(/^meta\[|\]$/g, "").split("=")
    el.setAttribute(attrName, (attrVal ?? "").replace(/^"|"$/g, ""))
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

export function HeadMeta({ title, description, image, url, index = true, jsonLd }: HeadMetaProps) {
  useEffect(() => {
    if (typeof document === "undefined") return

    if (title) {
      document.title = title.includes("looms") ? title : `${title} — looms`
      updateMetaTag('meta[property="og:title"]', "content", title)
      updateMetaTag('meta[name="twitter:title"]', "content", title)
    }

    if (description) {
      updateMetaTag('meta[name="description"]', "content", description)
      updateMetaTag('meta[property="og:description"]', "content", description)
      updateMetaTag('meta[name="twitter:description"]', "content", description)
    }

    if (image) {
      updateMetaTag('meta[property="og:image"]', "content", image)
      updateMetaTag('meta[name="twitter:image"]', "content", image)
    }

    if (url) {
      // Canonical + og:url are always absolute on the production origin, never
      // localhost preview origins — they travel with link tags and share URLs.
      const canonical = url.startsWith("http") ? url : `https://looms.gg${withBase(url)}`
      updateMetaTag('meta[property="og:url"]', "content", canonical)

      let link = document.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement("link")
        link.setAttribute("rel", "canonical")
        document.head.appendChild(link)
      }
      link.setAttribute("href", canonical)
    }

    // Robots: indexable routes declare index,follow; private/thin/reported
    // routes switch the live document to noindex,follow.
    updateMetaTag('meta[name="robots"]', "content", index ? "index, follow" : "noindex, follow")

    // JSON-LD: one route-owned script tag, replaced on every navigation.
    const JSONLD_ID = "looms-route-jsonld"
    let script = document.getElementById(JSONLD_ID)
    if (jsonLd) {
      if (!script) {
        script = document.createElement("script")
        script.setAttribute("id", JSONLD_ID)
        script.setAttribute("type", "application/ld+json")
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
    } else {
      script?.remove()
    }
  }, [title, description, image, url, index, jsonLd])

  return null
}
