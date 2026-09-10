import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Shell } from "./components/shell/Shell"
import { RequireAuth } from "./components/auth/RequireAuth"
import { AdminGuard } from "./components/auth/AdminGuard"
import { routerBasename } from "./lib/basePath"
import { ExplorePage } from "./pages/ExplorePage"
import { LegalDocument } from "./pages/legal/LegalDocument"
import { ClosetProvider } from "./state/closet"
import { ThemeProvider } from "./state/theme"
import { AuthProvider } from "./state/auth"
import { CatalogProvider } from "./state/catalog"
import { LikesProvider } from "./state/likes"

// Home page stays eager; the rest load on navigation so the main bundle stays
// small (Explore pulls the render engine via its own async chunk).
const PiecePage = lazy(() => import("./pages/PiecePage").then((m) => ({ default: m.PiecePage })))
const LookPage = lazy(() => import("./pages/LookPage").then((m) => ({ default: m.LookPage })))
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })))
const StudioPage = lazy(() => import("./pages/StudioPage").then((m) => ({ default: m.StudioPage })))
const EditorPage = lazy(() => import("./pages/editor/EditorPage").then((m) => ({ default: m.EditorPage })))
const WardrobePage = lazy(() => import("./pages/WardrobePage").then((m) => ({ default: m.WardrobePage })))
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })))
const SettingsRoute = lazy(() =>
  import("./pages/settings/SettingsPage").then((m) => ({ default: m.SettingsRoute })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  )
}

export default function App() {
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

  return (
    <ThemeProvider>
      <AuthProvider>
        <LikesProvider>
          <CatalogProvider>
            <ClosetProvider>
              <BrowserRouter basename={routerBasename()}>
                <Routes>
                  <Route element={<Shell />}>
                    <Route index element={<ExplorePage />} />
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
                          <EditorPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="settings"
                      element={
                        <Suspense fallback={<RouteFallback />}>
                          <SettingsRoute />
                        </Suspense>
                      }
                    />
                    <Route path="privacy" element={<LegalDocument docId="privacy" />} />
                    <Route path="terms" element={<LegalDocument docId="terms" />} />
                    <Route path="cookies" element={<LegalDocument docId="cookies" />} />
                    <Route path="guidelines" element={<LegalDocument docId="guidelines" />} />
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
            </ClosetProvider>
          </CatalogProvider>
        </LikesProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
