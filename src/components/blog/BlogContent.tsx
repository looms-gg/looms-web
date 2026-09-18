import { useMemo, type ReactNode } from "react"
import { sanitizeUrl } from "../../lib/sanitize"

type Token =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "image"; alt: string; url: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "bullet_list"; items: string[] }
  | { type: "ordered_list"; items: string[] }
  | { type: "code_block"; code: string; lang?: string }
  | { type: "hr" }
  | { type: "paragraph"; text: string }

/**
 * Parses markdown inline tokens:
 * - `**bold**` or `__bold__`
 * - `*italic*` or `_italic_`
 * - `[text](url)`
 * - `` `code` ``
 */
export function renderInlineMarkdown(text: string): ReactNode[] {
  const elements: ReactNode[] = []
  const regex =
    /(!?\[([^\]]*)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*|__([^_]+)__)|(\*([^*]+)\*|_([^_]+)_)|(`([^`]+)`)/g

  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIndex = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index))
    }

    const fullMatch = match[0]

    if (fullMatch.startsWith("![") && match[2] !== undefined && match[3]) {
      // Inline image inside text
      const alt = match[2]
      const rawUrl = match[3]
      const safeUrl = sanitizeUrl(rawUrl)
      if (safeUrl) {
        elements.push(
          <img
            key={`img-${keyIndex++}`}
            src={safeUrl}
            alt={alt}
            loading="lazy"
            className="inline-block max-h-96 rounded-xl"
          />,
        )
      }
    } else if (fullMatch.startsWith("[") && match[2] !== undefined && match[3]) {
      // Link
      const label = match[2]
      const rawUrl = match[3]
      const safeUrl = sanitizeUrl(rawUrl)
      if (safeUrl) {
        const isInternal = safeUrl.startsWith("/") || safeUrl.includes("looms.gg")
        elements.push(
          <a
            key={`link-${keyIndex++}`}
            href={safeUrl}
            target={isInternal ? undefined : "_blank"}
            rel={isInternal ? undefined : "noopener noreferrer"}
            className="font-bold text-primary underline-offset-4 transition-colors hover:underline"
          >
            {label}
          </a>,
        )
      } else {
        elements.push(label)
      }
    } else if (match[5] || match[6]) {
      // Bold
      const boldContent = match[5] || match[6]
      elements.push(
        <strong key={`b-${keyIndex++}`} className="font-extrabold text-base-content">
          {boldContent}
        </strong>,
      )
    } else if (match[8] || match[9]) {
      // Italic
      const italicContent = match[8] || match[9]
      elements.push(
        <em key={`i-${keyIndex++}`} className="italic">
          {italicContent}
        </em>,
      )
    } else if (match[11]) {
      // Inline code
      const codeContent = match[11]
      elements.push(
        <code
          key={`code-${keyIndex++}`}
          className="rounded-md bg-base-200 px-1.5 py-0.5 font-mono text-xs text-base-content/90"
        >
          {codeContent}
        </code>,
      )
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex))
  }

  return elements.length > 0 ? elements : [text]
}

/**
 * Tokenizes markdown source text into block tokens.
 */
export function tokenizeMarkdown(rawContent: string): Token[] {
  const tokens: Token[] = []
  const lines = rawContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Blank line
    if (!trimmed) {
      i++
      continue
    }

    // Code block ```
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      tokens.push({ type: "code_block", code: codeLines.join("\n"), lang })
      continue
    }

    // Horizontal rule --- or ***
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      tokens.push({ type: "hr" })
      i++
      continue
    }

    // Standalone Image ![Alt](url)
    const imgMatch = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/.exec(trimmed)
    if (imgMatch) {
      tokens.push({ type: "image", alt: imgMatch[1], url: imgMatch[2] })
      i++
      continue
    }

    // Heading 2 ##
    if (/^##\s+/.test(trimmed)) {
      tokens.push({ type: "h2", text: trimmed.replace(/^##\s+/, "").trim() })
      i++
      continue
    }

    // Heading 3 ###
    if (/^###\s+/.test(trimmed)) {
      tokens.push({ type: "h3", text: trimmed.replace(/^###\s+/, "").trim() })
      i++
      continue
    }

    // Heading 4 ####
    if (/^####\s+/.test(trimmed)) {
      tokens.push({ type: "h4", text: trimmed.replace(/^####\s+/, "").trim() })
      i++
      continue
    }

    // Blockquote >
    if (trimmed.startsWith(">")) {
      const bqLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        bqLines.push(lines[i].trim().replace(/^>\s?/, ""))
        i++
      }
      tokens.push({ type: "blockquote", lines: bqLines })
      continue
    }

    // Bullet list - or *
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ""))
        i++
      }
      tokens.push({ type: "bullet_list", items: listItems })
      continue
    }

    // Ordered list 1.
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ""))
        i++
      }
      tokens.push({ type: "ordered_list", items: listItems })
      continue
    }

    // Paragraph
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !lines[i].trim().startsWith("```") &&
      !/^(\*{3,}|-{3,}|_{3,})$/.test(lines[i].trim()) &&
      !/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim())
      i++
    }

    if (paraLines.length > 0) {
      tokens.push({ type: "paragraph", text: paraLines.join(" ") })
    } else {
      // Unmatched block marker such as "#", "#####", or "#Title". Consume the
      // line so the tokenizer always advances instead of looping forever.
      tokens.push({ type: "paragraph", text: trimmed })
      i++
    }
  }

  return tokens
}

export type BlogContentProps = {
  content: string
  className?: string
}

/**
 * Builds stable React keys from token content instead of array index, so a
 * mid-document edit does not remount every block below the cursor (which
 * would re-decode all images on each keystroke).
 */
export function buildTokenKeys(tokens: Token[]): string[] {
  const counts = new Map<string, number>()
  return tokens.map((token) => {
    const json = JSON.stringify(token)
    let hash = 0
    for (let i = 0; i < json.length; i++) {
      hash = (hash * 31 + json.charCodeAt(i)) | 0
    }
    const base = `${token.type}-${(hash >>> 0).toString(36)}`
    const occurrence = counts.get(base) ?? 0
    counts.set(base, occurrence + 1)
    return `${base}-${occurrence}`
  })
}

/**
 * Editorial blog post content renderer with warm, readable looms typography.
 * Natural left-aligned paragraphs, structured headings, clean callouts,
 * and secure link / image sanitization.
 */
export function BlogContent({ content, className = "" }: BlogContentProps) {
  const tokens = useMemo(() => tokenizeMarkdown(content), [content])
  const keys = useMemo(() => buildTokenKeys(tokens), [tokens])

  return (
    <div className={`blog-prose space-y-6 text-base-content ${className}`}>
      {tokens.map((token, index) => {
        const key = keys[index]
        switch (token.type) {
          case "h2":
            return (
              <h2
                key={key}
                className="mt-10 mb-3 text-2xl font-extrabold tracking-tight text-base-content sm:text-3xl text-balance"
              >
                {renderInlineMarkdown(token.text)}
              </h2>
            )

          case "h3":
            return (
              <h3
                key={key}
                className="mt-8 mb-2.5 text-xl font-extrabold tracking-tight text-base-content sm:text-2xl text-balance"
              >
                {renderInlineMarkdown(token.text)}
              </h3>
            )

          case "h4":
            return (
              <h4
                key={key}
                className="mt-6 mb-2 text-lg font-bold tracking-tight text-base-content sm:text-xl text-balance"
              >
                {renderInlineMarkdown(token.text)}
              </h4>
            )

          case "image": {
            const safeUrl = sanitizeUrl(token.url)
            if (!safeUrl) return null
            return (
              <figure
                key={key}
                className="my-8 flex flex-col items-center justify-center text-center"
              >
                <div className="overflow-hidden rounded-[18px] bg-base-200">
                  <img
                    src={safeUrl}
                    alt={token.alt}
                    loading="lazy"
                    className="max-h-[520px] w-auto max-w-full object-contain"
                  />
                </div>
                {token.alt ? (
                  <figcaption className="mt-2.5 max-w-lg text-center text-xs font-semibold text-base-content/60 sm:text-sm text-pretty">
                    {token.alt}
                  </figcaption>
                ) : null}
              </figure>
            )
          }

          case "blockquote":
            return (
              <blockquote
                key={key}
                className="my-6 border-l-2 border-base-content/20 py-1 pl-5 text-base italic text-base-content/80 sm:text-lg"
              >
                {token.lines.map((line, i) => (
                  <p key={`bql-${i}`} className="text-pretty">
                    {renderInlineMarkdown(line)}
                  </p>
                ))}
              </blockquote>
            )

          case "bullet_list":
            return (
              <ul
                key={key}
                className="my-5 list-disc space-y-2 pl-6 text-base leading-relaxed text-base-content/85 sm:text-lg"
              >
                {token.items.map((item, i) => (
                  <li key={`li-${i}`}>{renderInlineMarkdown(item)}</li>
                ))}
              </ul>
            )

          case "ordered_list":
            return (
              <ol
                key={key}
                className="my-5 list-decimal space-y-2 pl-6 text-base leading-relaxed text-base-content/85 sm:text-lg"
              >
                {token.items.map((item, i) => (
                  <li key={`oli-${i}`}>{renderInlineMarkdown(item)}</li>
                ))}
              </ol>
            )

          case "code_block":
            return (
              <div
                key={key}
                className="my-6 overflow-x-auto rounded-[14px] bg-neutral p-4"
              >
                {token.lang ? (
                  <div className="mb-1.5 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                    {token.lang}
                  </div>
                ) : null}
                <pre className="font-mono text-xs leading-relaxed text-base-content/90 sm:text-sm">
                  <code>{token.code}</code>
                </pre>
              </div>
            )

          case "hr":
            return (
              <hr
                key={key}
                className="my-10 border-t border-base-content/15"
              />
            )

          case "paragraph":
          default:
            return (
              <p
                key={key}
                className="my-4 text-base leading-relaxed text-base-content/85 sm:text-lg text-pretty"
              >
                {renderInlineMarkdown(token.text)}
              </p>
            )
        }
      })}
    </div>
  )
}
