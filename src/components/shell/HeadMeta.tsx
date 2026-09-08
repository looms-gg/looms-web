import { useEffect } from "react"

export type HeadMetaProps = {
  title?: string
  description?: string
  image?: string
  url?: string
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

export function HeadMeta({ title, description, image, url }: HeadMetaProps) {
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
      updateMetaTag('meta[property="og:url"]', "content", url)
    }
  }, [title, description, image, url])

  return null
}
