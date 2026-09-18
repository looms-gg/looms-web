import { lazy, Suspense, useEffect, type ReactNode } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { IconContext } from "@phosphor-icons/react"
import { Shell } from "./components/shell/Shell"
import { RequireAuth } from "./components/auth/RequireAuth"
import { AdminGuard } from "./components/auth/AdminGuard"
import { routerBasename } from "./lib/basePath"
import { ExplorePage } from "./pages/ExplorePage"
import { LegalDocument } from "./pages/legal/LegalDocument"
import { WardrobeProvider } from "./state/wardrobe"
import { AuthProvider } from "./state/auth"
import { VerifyEmailProvider } from "./state/verifyEmail"
import { ConnectionsProvider } from "./state/connections"
import { CatalogProvider } from "./state/catalog"
import { LikesProvider } from "./state/likes"
import { NotificationsProvider } from "./state/notifications"

// Home page stays eager; the rest load on navigation so the main bundle stays
// small (Explore pulls the render engine via its own async chunk).
const PiecePage = lazy(() => import("./pages/PiecePage").then((m) => ({ default: m.PiecePage })))
const LookPage = lazy(() => import("./pages/LookPage").then((m) => ({ default: m.LookPage })))
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })))
const StudioPage = lazy(() => import("./pages/StudioPage").then((m) => ({ default: m.StudioPage })))
const EditorPage = lazy(() => import("./pages/EditorPage").then((m) => ({ default: m.EditorPage })))
const WardrobePage = lazy(() => import("./pages/WardrobePage").then((m) => ({ default: m.WardrobePage })))
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })))
const BlogPage = lazy(() => import("./pages/BlogPage").then((m) => ({ default: m.BlogPage })))
const BlogPostPage = lazy(() => import("./pages/BlogPostPage").then((m) => ({ default: m.BlogPostPage })))
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
)
const ResetPasswordPage = lazy(() =>
  import("./pages/reset-password/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  })),
)
const AuthCallbackPage = lazy(() =>
  import("./pages/auth/AuthCallbackPage").then((m) => ({
    default: m.AuthCallbackPage,
  })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  )
}

function useScrollClass() {
  useEffect(() => {
    let scrollTimer: ReturnType<typeof setTimeout> | null = null
    const onScroll = () => {
      if (!document.body.classList.contains("is-scrolling")) {
        document.body.classList.add("is-scrolling")
      }
      if (scrollTimer !== null) clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        document.body.classList.remove("is-scrolling")
        scrollTimer = null
      }, 100)
    }
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true })
      if (scrollTimer !== null) clearTimeout(scrollTimer)
      document.body.classList.remove("is-scrolling")
    }
  }, [])
}

// AuthProvider must stay outermost of the state stack: Catalog,
// Connections, Notifications, Likes, and Wardrobe read the session
// via useAuthOptional and reset themselves when the user changes.
const STATE_PROVIDERS: Array<({ children }: { children: ReactNode }) => ReactNode> = [
  AuthProvider,
  VerifyEmailProvider,
  ConnectionsProvider,
  NotificationsProvider,
  LikesProvider,
  CatalogProvider,
  WardrobeProvider,
]

function AppProviders({ children }: { children: ReactNode }) {
  return STATE_PROVIDERS.reduceRight<ReactNode>(
    (acc, Provider) => <Provider>{acc}</Provider>,
    children,
  )
}

export default function App() {
  useScrollClass()

  return (
    // Solid (fill) weight for every Phosphor icon app-wide. The `Icon`
    // wrapper enforces this too, so direct usages stay consistent.
    <IconContext.Provider value={{ weight: "fill" }}>
      <AppProviders>
        <BrowserRouter basename={routerBasename()}>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<ExplorePage />} />
              {/* Prerendered landing page; the SPA aliases it to Explore in looks mode. */}
              <Route path="look" element={<ExplorePage />} />
              <Route
                path="piece/:id"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <PiecePage />
                  </Suspense>
                }
              />
              <Route
                path="look/:id"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <LookPage />
                  </Suspense>
                }
              />
              <Route
                path="u/:username"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="wardrobe"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <RequireAuth
                      title="Sign in to open your wardrobe"
                      body="Save pieces and looks to your account to use them across devices."
                    >
                      <WardrobePage />
                    </RequireAuth>
                  </Suspense>
                }
              />
              <Route
                path="studio"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <RequireAuth
                      title="Sign in to use Studio"
                      body="Mix layers into a Minecraft skin after you create an account."
                    >
                      <StudioPage />
                    </RequireAuth>
                  </Suspense>
                }
              />
              <Route
                path="editor"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    {/* Open by design: drawing is local-only, and saving is gated
                        server-side by garment RLS, so no client guard here. */}
                    <EditorPage />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <RequireAuth
                      title="Sign in to open settings"
                      body="Your privacy, upload, and account controls live here once you're signed in."
                    >
                      <SettingsPage />
                    </RequireAuth>
                  </Suspense>
                }
              />
              <Route
                path="reset-password"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <ResetPasswordPage />
                  </Suspense>
                }
              />
              <Route
                path="auth/callback"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <AuthCallbackPage />
                  </Suspense>
                }
              />
              <Route path="privacy" element={<LegalDocument docId="privacy" />} />
              <Route path="terms" element={<LegalDocument docId="terms" />} />
              <Route path="cookies" element={<LegalDocument docId="cookies" />} />
              <Route path="guidelines" element={<LegalDocument docId="guidelines" />} />
              <Route path="ai" element={<LegalDocument docId="ai" />} />
              <Route
                path="blog"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <BlogPage />
                  </Suspense>
                }
              />
              <Route
                path="blog/:slug"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <BlogPostPage />
                  </Suspense>
                }
              />
              <Route
                path="admin"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <AdminGuard>
                      <AdminPage />
                    </AdminGuard>
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProviders>
    </IconContext.Provider>
  )
}
