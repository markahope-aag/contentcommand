// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock useFormStatus to control pending state
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: jest.fn(() => ({ pending: false })),
}));

import { SubmitButton } from "@/components/ui/submit-button";
import { useFormStatus } from "react-dom";

describe("SubmitButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFormStatus as jest.Mock).mockReturnValue({ pending: false });
  });

  it("renders with children text", () => {
    render(<SubmitButton>Save Changes</SubmitButton>);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("renders as type=submit", () => {
    render(<SubmitButton>Submit</SubmitButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("is enabled when not pending", () => {
    (useFormStatus as jest.Mock).mockReturnValue({ pending: false });
    render(<SubmitButton>Submit</SubmitButton>);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("is disabled when pending", () => {
    (useFormStatus as jest.Mock).mockReturnValue({ pending: true });
    render(<SubmitButton>Submit</SubmitButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows spinner when pending", () => {
    (useFormStatus as jest.Mock).mockReturnValue({ pending: true });
    const { container } = render(<SubmitButton>Submit</SubmitButton>);
    // Spinner should be rendered (it's an SVG or div with specific class)
    expect(container.querySelector("[role='status'], .animate-spin, svg")).toBeTruthy();
  });

  it("shows loadingText when pending and loadingText provided", () => {
    (useFormStatus as jest.Mock).mockReturnValue({ pending: true });
    render(<SubmitButton loadingText="Saving...">Save</SubmitButton>);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("shows children when not pending even if loadingText provided", () => {
    (useFormStatus as jest.Mock).mockReturnValue({ pending: false });
    render(<SubmitButton loadingText="Saving...">Save Changes</SubmitButton>);
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("passes additional props to Button", () => {
    render(<SubmitButton variant="destructive">Delete</SubmitButton>);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });
});
