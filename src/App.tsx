import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Shell } from "./components/shell/Shell"
import { RequireAuth } from "./components/auth/RequireAuth"
import { AdminGuard } from "./components/auth/AdminGuard"
import { routerBasename } from "./lib/basePath"
import { ExplorePage } from "./pages/ExplorePage"
import { PiecePage } from "./pages/PiecePage"
import { LookPage } from "./pages/LookPage"
import { ProfilePage } from "./pages/ProfilePage"
import { StudioPage } from "./pages/StudioPage"
import { WardrobePage } from "./pages/WardrobePage"
import { AdminPage } from "./pages/AdminPage"
import { LegalDocument } from "./pages/legal/LegalDocument"
import { ClosetProvider } from "./state/closet"
import { ThemeProvider } from "./state/theme"
import { AuthProvider } from "./state/auth"
import { CatalogProvider } from "./state/catalog"
import { LikesProvider } from "./state/likes"

export default function App() {
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
                    <Route path="piece/:id" element={<PiecePage />} />
                    <Route path="look/:id" element={<LookPage />} />
                    <Route path="u/:username" element={<ProfilePage />} />
                    <Route
                      path="wardrobe"
                      element={
                        <RequireAuth
                          title="Sign in to open your wardrobe"
                          body="Save pieces and looks to your account to use them across devices."
                        >
                          <WardrobePage />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="studio"
                      element={
                        <RequireAuth
                          title="Sign in to use Studio"
                          body="Mix layers into a Minecraft skin after you create an account."
                        >
                          <StudioPage />
                        </RequireAuth>
                      }
                    />
                    <Route path="privacy" element={<LegalDocument docId="privacy" />} />
                    <Route path="terms" element={<LegalDocument docId="terms" />} />
                    <Route path="cookies" element={<LegalDocument docId="cookies" />} />
                    <Route path="guidelines" element={<LegalDocument docId="guidelines" />} />
                    <Route
                      path="admin"
                      element={
                        <AdminGuard>
                          <AdminPage />
                        </AdminGuard>
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
