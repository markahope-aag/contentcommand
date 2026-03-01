// @ts-nocheck
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GlobalErrorPage from "@/app/global-error";

describe("GlobalError (global error boundary)", () => {
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("renders Something went wrong heading", () => {
    const error = new Error("Fatal error");
    render(<GlobalErrorPage error={error} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders error description text", () => {
    const error = new Error("Fatal error");
    render(<GlobalErrorPage error={error} reset={mockReset} />);
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
  });

  it("renders Try again button", () => {
    const error = new Error("Fatal error");
    render(<GlobalErrorPage error={error} reset={mockReset} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls reset when Try again button is clicked", () => {
    const error = new Error("Fatal error");
    render(<GlobalErrorPage error={error} reset={mockReset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("shows error digest when provided", () => {
    const error = Object.assign(new Error("Fatal"), { digest: "fatal-xyz" });
    render(<GlobalErrorPage error={error} reset={mockReset} />);
    expect(screen.getByText(/fatal-xyz/i)).toBeInTheDocument();
  });

  it("does not show error ID when digest is absent", () => {
    const error = new Error("Fatal error");
    render(<GlobalErrorPage error={error} reset={mockReset} />);
    expect(screen.queryByText(/Error ID:/i)).not.toBeInTheDocument();
  });

  it("logs error to console on mount", () => {
    const error = new Error("Test fatal");
    render(<GlobalErrorPage error={error} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith("Global error:", error);
  });
});
