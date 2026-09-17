import { vi } from "vitest"
import type { AuthContextValue } from "../state/auth"

export function makeAuthStub(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    session: null,
    profile: null,
    avatarUrl: null,
    loading: false,
    profileError: null,
    dismissProfileError: vi.fn(),
    emailVerified: false,
    pendingEmail: null,
    resendConfirmation: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signUpWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    completeOnboarding: vi.fn().mockResolvedValue({ error: null }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    deleteAccount: vi.fn().mockResolvedValue({ error: null }),
    updateProfile: vi.fn().mockResolvedValue({ error: null }),
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}
