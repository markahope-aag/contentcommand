// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock the hook and Radix UI primitives
jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(),
}));

jest.mock("@radix-ui/react-toast", () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>,
  Viewport: ({ className }: { className?: string }) => <div data-testid="toast-viewport" className={className} />,
  Root: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="toast-root" className={className}>{children}</div>
  ),
  Title: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-title">{children}</div>,
  Description: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-description">{children}</div>,
  Close: () => <button data-testid="toast-close">Close</button>,
  Action: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

describe("Toaster", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without toasts when list is empty", () => {
    (useToast as jest.Mock).mockReturnValue({ toasts: [] });
    render(<Toaster />);
    expect(screen.getByTestId("toast-provider")).toBeInTheDocument();
    expect(screen.getByTestId("toast-viewport")).toBeInTheDocument();
  });

  it("renders a toast with title and description", () => {
    (useToast as jest.Mock).mockReturnValue({
      toasts: [
        {
          id: "toast-1",
          title: "Success",
          description: "Operation completed.",
        },
      ],
    });

    render(<Toaster />);
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Operation completed.")).toBeInTheDocument();
  });

  it("renders multiple toasts", () => {
    (useToast as jest.Mock).mockReturnValue({
      toasts: [
        { id: "t1", title: "First Toast" },
        { id: "t2", title: "Second Toast" },
      ],
    });

    render(<Toaster />);
    expect(screen.getByText("First Toast")).toBeInTheDocument();
    expect(screen.getByText("Second Toast")).toBeInTheDocument();
  });

  it("renders toast without description when not provided", () => {
    (useToast as jest.Mock).mockReturnValue({
      toasts: [{ id: "t1", title: "Just a title" }],
    });

    render(<Toaster />);
    expect(screen.getByText("Just a title")).toBeInTheDocument();
    expect(screen.queryByTestId("toast-description")).not.toBeInTheDocument();
  });

  it("renders toast without title when not provided", () => {
    (useToast as jest.Mock).mockReturnValue({
      toasts: [{ id: "t1", description: "Just a description" }],
    });

    render(<Toaster />);
    expect(screen.getByText("Just a description")).toBeInTheDocument();
    expect(screen.queryByTestId("toast-title")).not.toBeInTheDocument();
  });

  it("renders a close button for each toast", () => {
    (useToast as jest.Mock).mockReturnValue({
      toasts: [
        { id: "t1", title: "Toast 1" },
        { id: "t2", title: "Toast 2" },
      ],
    });

    render(<Toaster />);
    const closeButtons = screen.getAllByTestId("toast-close");
    expect(closeButtons).toHaveLength(2);
  });
});
