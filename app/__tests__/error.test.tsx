// @ts-nocheck
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorPage from "@/app/error";

describe("Error (root error boundary)", () => {
  const mockError = new Error("Something broke");
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("renders error heading", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders error message description", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
  });

  it("renders Try again button", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders Go to Dashboard link", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toBeInTheDocument();
  });

  it("calls reset when Try again button is clicked", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("shows error digest when provided", () => {
    const errorWithDigest = Object.assign(new Error("Test"), { digest: "abc-123" });
    render(<ErrorPage error={errorWithDigest} reset={mockReset} />);
    expect(screen.getByText(/abc-123/i)).toBeInTheDocument();
  });

  it("does not show error ID section when digest is absent", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.queryByText(/Error ID:/i)).not.toBeInTheDocument();
  });

  it("logs error to console on mount", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith("App error:", mockError);
  });
});
