import { Link } from "react-router-dom"
import { LEGAL_DOCS, type LegalDocId } from "./content"

const DOC_LINKS: { id: LegalDocId; label: string }[] = [
  { id: "privacy", label: "Privacy" },
  { id: "terms", label: "Terms" },
  { id: "cookies", label: "Cookies" },
  { id: "guidelines", label: "Guidelines" },
]

export function LegalDocument({ docId }: { docId: LegalDocId }) {
  const doc = LEGAL_DOCS[docId]

  return (
    <article className="mx-auto max-w-prose py-4 md:py-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/55">
        Legal
      </p>
      <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight md:text-4xl">
        {doc.title}
      </h1>
      <p className="mt-2 text-sm text-base-content/60">Last updated {doc.updated}</p>

      <nav aria-label="Legal documents" className="mt-6 flex flex-wrap gap-2">
        {DOC_LINKS.map((link) => (
          <Link
            key={link.id}
            to={`/${link.id}`}
            className={`btn btn-sm rounded-full font-bold ${
              link.id === docId ? "btn-primary" : "btn-ghost border border-base-content/15"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-10 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-extrabold tracking-tight text-pretty">{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p
                key={p.slice(0, 48)}
                className="mt-3 text-base leading-relaxed text-base-content/80 text-pretty"
              >
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  )
}
