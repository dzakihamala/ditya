import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = vi.fn();

vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import { AuthGuard } from "@/lib/AuthGuard";

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner when auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("renders children when user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "abc123", email: "admin@test.com" },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    expect(screen.getByText("Protected Content")).toBeDefined();
  });

  it("redirects to /admin when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    expect(mockPush).toHaveBeenCalledWith("/admin");
  });
});
