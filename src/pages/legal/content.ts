export type LegalDocId = "privacy" | "terms" | "cookies" | "guidelines"

export type LegalSection = {
  heading: string
  paragraphs: string[]
}

export type LegalDoc = {
  id: LegalDocId
  title: string
  updated: string
  sections: LegalSection[]
}

const DISCORD = "https://discord.gg/k4DcnznKzd"
const CONTACT = "privacy@[TBD]"

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    updated: "2026-09-07",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          `looms is operated by ser0th in the United States. This policy explains what personal data we process when you use the looms website and related services.`,
          `Contact for privacy requests: ${CONTACT} (placeholder — replace with a real address before treating this policy as final). Community questions can also go through Discord at ${DISCORD}.`,
        ],
      },
      {
        heading: "What we collect",
        paragraphs: [
          "Account data: email address, password (stored hashed by our auth provider), username, and optional Minecraft username.",
          "Content you create: saved looks (outfit recipes) and garment textures you upload, plus related metadata such as names, descriptions, and visibility.",
          "Technical preferences: authentication/session cookies, theme preference, and your cookie-consent choice stored in the browser.",
        ],
      },
      {
        heading: "How we use data",
        paragraphs: [
          "We use this data to run looms: sign you in, sync wardrobe looks, host uploads within quotas, show your profile cues, and remember theme and cookie preferences.",
          "We do not sell personal data. We do not run advertising trackers today.",
        ],
      },
      {
        heading: "Processors",
        paragraphs: [
          "We use Supabase for authentication, database, and file storage. Supabase processes data on our behalf to provide those services.",
        ],
      },
      {
        heading: "Retention",
        paragraphs: [
          "Account and content data are kept while your account exists, subject to storage quotas and abuse enforcement. You can request deletion via the contact email above.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Depending on where you live, you may have rights to access, correct, delete, or export personal data, or to object to certain processing. Email the contact above to make a request. We may need to verify you control the account.",
        ],
      },
      {
        heading: "Children",
        paragraphs: [
          "looms is not directed at children under 13 (or the minimum age required in your region). If you believe a child created an account, contact us so we can remove it.",
        ],
      },
      {
        heading: "Changes",
        paragraphs: [
          "We may update this policy. The “Last updated” date at the top will change when we do. Continued use after an update means you accept the revised policy.",
        ],
      },
    ],
  },
  terms: {
    id: "terms",
    title: "Terms of Service",
    updated: "2026-09-07",
    sections: [
      {
        heading: "The service",
        paragraphs: [
          "looms is a free modular Minecraft skin creator. You can browse clothing layers, add pieces to your wardrobe at no cost, assemble outfits in Studio, and export a vanilla PNG skin for personal use.",
          "There are no paid unlocks, microtransactions, or ads in the current product. The service is provided as-is by ser0th.",
        ],
      },
      {
        heading: "Not affiliated with Mojang",
        paragraphs: [
          "looms is an unofficial fan project. It is not associated with, endorsed by, or sponsored by Mojang Studios, Microsoft, or Minecraft. Minecraft is a trademark of Mojang Synergies AB.",
        ],
      },
      {
        heading: "Accounts",
        paragraphs: [
          "You must provide accurate information and keep your credentials secure. You are responsible for activity on your account. We may suspend or terminate accounts that break these terms or our Community Guidelines.",
        ],
      },
      {
        heading: "Your content",
        paragraphs: [
          "You retain rights to skins and garments you upload. By uploading, you grant looms a non-exclusive license to host, display, and process that content so the service can work (including public catalogue display when you make an item public).",
          "You must only upload content you have the right to use. Do not upload stolen intellectual property, malware, or prohibited material described in the Community Guidelines.",
        ],
      },
      {
        heading: "Exports and Minecraft use",
        paragraphs: [
          "Exported skins are for personal Minecraft use subject to Mojang’s terms and applicable law. You are responsible for how you use downloads outside looms.",
        ],
      },
      {
        heading: "Disclaimers",
        paragraphs: [
          "looms is a free hobby project. We provide it without warranties of any kind, to the fullest extent permitted by law. We are not liable for lost data, interrupted service, or damages arising from use of the site, except where liability cannot be excluded.",
        ],
      },
      {
        heading: "Changes and contact",
        paragraphs: [
          `We may update these terms. The “Last updated” date will change when we do. Questions: ${CONTACT} or Discord ${DISCORD}.`,
        ],
      },
    ],
  },
  cookies: {
    id: "cookies",
    title: "Cookie Policy",
    updated: "2026-09-07",
    sections: [
      {
        heading: "Overview",
        paragraphs: [
          "This page explains how looms uses cookies and similar browser storage. It pairs with our simple consent banner: Accept all or Reject non-essential.",
        ],
      },
      {
        heading: "Essential cookies and storage",
        paragraphs: [
          "Essential items keep the site working. They include authentication/session storage from our auth provider, theme preference, and the cookie-consent record itself (so we remember your choice).",
          "These are required for core features. Rejecting non-essential cookies does not disable them.",
        ],
      },
      {
        heading: "Non-essential cookies",
        paragraphs: [
          "Non-essential cookies (for example analytics or marketing) are not loaded today. If we add them later, they will only run after you choose Accept all, gated by your stored consent preference.",
        ],
      },
      {
        heading: "Changing your mind",
        paragraphs: [
          "Use Cookie settings in the site footer to clear your choice and see the banner again. You can also clear site data in your browser.",
        ],
      },
      {
        heading: "More information",
        paragraphs: [
          `See the Privacy Policy for how personal data is handled. Contact: ${CONTACT}.`,
        ],
      },
    ],
  },
  guidelines: {
    id: "guidelines",
    title: "Community Guidelines",
    updated: "2026-09-07",
    sections: [
      {
        heading: "Be cool in the closet",
        paragraphs: [
          "looms is for sharing wearable Minecraft layers and outfits. Keep uploads original or properly licensed, and treat other players with respect.",
        ],
      },
      {
        heading: "Allowed",
        paragraphs: [
          "Original skins and clothing layers, collaborative work you have permission to post, and constructive feedback in community spaces such as Discord.",
        ],
      },
      {
        heading: "Not allowed",
        paragraphs: [
          "Child sexual abuse material or sexual content involving minors; hate speech; harassment; impersonation; malware or deceptive textures; stolen intellectual property; spam floods; or other illegal content.",
        ],
      },
      {
        heading: "Enforcement",
        paragraphs: [
          "We may remove content, limit uploads, or suspend accounts that break these rules or applicable law. Decisions aim to keep the plaza safe for everyone.",
        ],
      },
      {
        heading: "Reporting",
        paragraphs: [
          `Report issues via Discord (${DISCORD}) or email ${CONTACT}. Include links or IDs when you can.`,
        ],
      },
    ],
  },
}
