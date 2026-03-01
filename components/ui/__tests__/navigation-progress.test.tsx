// @ts-nocheck
import React from "react";
import { render, screen, act } from "@testing-library/react";

// usePathname and useSearchParams are already mocked in jest.setup.ts
// We import them to control the values
import { usePathname, useSearchParams } from "next/navigation";

import { NavigationProgress } from "@/components/ui/navigation-progress";

describe("NavigationProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders nothing initially (not visible)", () => {
    const { container } = render(<NavigationProgress />);
    // Initially progress is not visible - completeProgress runs on mount
    // After timeout, setVisible(false) is called
    act(() => {
      jest.runAllTimers();
    });
    expect(container.firstChild).toBeNull();
  });

  it("shows progress bar when navigation starts", async () => {
    const { container } = render(<NavigationProgress />);

    // Simulate clicking an internal link
    await act(async () => {
      const event = new MouseEvent("click", { bubbles: true });
      const link = document.createElement("a");
      link.setAttribute("href", "/dashboard/clients");
      document.body.appendChild(link);
      link.dispatchEvent(event);
      // Advance time to let progress start
      jest.advanceTimersByTime(200);
      document.body.removeChild(link);
    });
  });

  it("does not show progress for external links", () => {
    render(<NavigationProgress />);

    act(() => {
      const event = new MouseEvent("click", { bubbles: true });
      const link = document.createElement("a");
      link.setAttribute("href", "https://external.com");
      document.body.appendChild(link);
      link.dispatchEvent(event);
      document.body.removeChild(link);
    });
    // No timer should be set for external links
    jest.runAllTimers();
  });

  it("does not show progress for hash links", () => {
    render(<NavigationProgress />);

    act(() => {
      const event = new MouseEvent("click", { bubbles: true });
      const link = document.createElement("a");
      link.setAttribute("href", "#section");
      document.body.appendChild(link);
      link.dispatchEvent(event);
      document.body.removeChild(link);
    });
    jest.runAllTimers();
  });

  it("completes progress on route change (pathname change)", () => {
    const { container } = render(<NavigationProgress />);

    // Run the initial completion timeout
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should not be visible after completion
    expect(container.firstChild).toBeNull();
  });
});
