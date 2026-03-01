// @ts-nocheck
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardError from "@/app/dashboard/error";

describe("DashboardError (dashboard error boundary)", () => {
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("renders Error heading", () => {
    const error = new Error("Load failed");
    render(<DashboardError error={error} reset={mockReset} />);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("renders Something went wrong card title", () => {
    const error = new Error("DB error");
    render(<DashboardError error={error} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders error message", () => {
    const error = new Error("DB connection failed");
    render(<DashboardError error={error} reset={mockReset} />);
    expect(screen.getByText("DB connection failed")).toBeInTheDocument();
  });

  it("renders Unknown error when message is empty", () => {
    const error = new Error("");
    render(<DashboardError error={error} reset={mockReset} />);
    expect(screen.getByText("Unknown error")).toBeInTheDocument();
  });

  it("renders Try again button", () => {
    const error = new Error("Test");
    render(<DashboardError error={error} reset={mockReset} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls reset when Try again button is clicked", () => {
    const error = new Error("Test");
    render(<DashboardError error={error} reset={mockReset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("shows error digest when provided", () => {
    const error = Object.assign(new Error("Oops"), { digest: "err-xyz" });
    render(<DashboardError error={error} reset={mockReset} />);
    expect(screen.getByText(/err-xyz/i)).toBeInTheDocument();
  });

  it("does not show error ID section when digest is absent", () => {
    const error = new Error("No digest");
    render(<DashboardError error={error} reset={mockReset} />);
    expect(screen.queryByText(/Error ID:/i)).not.toBeInTheDocument();
  });

  it("logs error to console on mount", () => {
    const error = new Error("Console test");
    render(<DashboardError error={error} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith("Dashboard error:", error);
  });

  it("has correct role alert attribute", () => {
    const error = new Error("Alert test");
    render(<DashboardError error={error} reset={mockReset} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
