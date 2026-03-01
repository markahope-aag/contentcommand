// @ts-nocheck
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock("next/image", () => {
  return function MockImage(props: any) {
    return <img alt={props.alt} src={props.src} />;
  };
});

import SignupPage from "@/app/(auth)/signup/page";
import { createClient } from "@/lib/supabase/client";

describe("SignupPage", () => {
  const mockSignUp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue({
      auth: { signUp: mockSignUp },
    });
  });

  it("renders Create your account description", () => {
    render(<SignupPage />);
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
  });

  it("renders email input field", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders password input field", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders Full Name input field", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
  });

  it("renders Create account button", () => {
    render(<SignupPage />);
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("renders link to login page", () => {
    render(<SignupPage />);
    const loginLink = screen.getByRole("link", { name: /sign in/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("shows Check your email heading after successful signup", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("Full Name"), "Test User");
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "securepassword");

    const form = document.querySelector("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
    });
  });

  it("shows error message when signup fails", async () => {
    mockSignUp.mockResolvedValue({ error: { message: "Email already in use" } });
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("Full Name"), "Test User");
    await userEvent.type(screen.getByLabelText("Email"), "existing@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");

    const form = document.querySelector("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Email already in use")).toBeInTheDocument();
    });
  });

  it("calls supabase signUp with email and password", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("Full Name"), "New User");
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "mypassword");

    const form = document.querySelector("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "new@example.com",
          password: "mypassword",
        })
      );
    });
  });
});
