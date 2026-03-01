// @ts-nocheck
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ContentEditor } from "@/components/content/content-editor";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

const mockContent = {
  id: "content-1",
  title: "SEO Guide",
  content: "This is the full content of the article.",
  meta_description: "A guide to SEO best practices.",
  excerpt: "A quick summary of SEO.",
  word_count: 500,
  ai_model_used: "claude-3-sonnet",
  generation_time_seconds: 4.2,
  status: "generated",
};

describe("ContentEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders content title", () => {
    render(<ContentEditor content={mockContent as any} />);
    expect(screen.getByText("SEO Guide")).toBeInTheDocument();
  });

  it("renders fallback Untitled when title is absent", () => {
    render(<ContentEditor content={{ ...mockContent, title: null } as any} />);
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });

  it("renders meta description", () => {
    render(<ContentEditor content={mockContent as any} />);
    expect(screen.getByText("A guide to SEO best practices.")).toBeInTheDocument();
  });

  it("renders word count badge", () => {
    render(<ContentEditor content={mockContent as any} />);
    expect(screen.getByText("500 words")).toBeInTheDocument();
  });

  it("renders AI model badge", () => {
    render(<ContentEditor content={mockContent as any} />);
    expect(screen.getByText("claude-3-sonnet")).toBeInTheDocument();
  });

  it("renders Copy button", () => {
    render(<ContentEditor content={mockContent as any} />);
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("renders excerpt when provided", () => {
    render(<ContentEditor content={mockContent as any} />);
    expect(screen.getByText("A quick summary of SEO.")).toBeInTheDocument();
  });

  it("renders content body", () => {
    render(<ContentEditor content={mockContent as any} />);
    expect(screen.getByText("This is the full content of the article.")).toBeInTheDocument();
  });

  it("renders generation time", () => {
    render(<ContentEditor content={mockContent as any} />);
    expect(screen.getByText(/generated in 4.2s/i)).toBeInTheDocument();
  });

  it("renders No content generated yet when content is absent", () => {
    render(<ContentEditor content={{ ...mockContent, content: null } as any} />);
    expect(screen.getByText("No content generated yet.")).toBeInTheDocument();
  });

  it("copies content and shows Copied! on button click", async () => {
    render(<ContentEditor content={mockContent as any} />);
    const copyButton = screen.getByRole("button", { name: /copy/i });

    await act(async () => {
      fireEvent.click(copyButton);
    });

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockContent.content);
    });
  });

  it("does not call clipboard when content is absent", async () => {
    render(<ContentEditor content={{ ...mockContent, content: null } as any} />);
    const copyButton = screen.getByRole("button", { name: /copy/i });

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("does not render meta description when absent", () => {
    render(<ContentEditor content={{ ...mockContent, meta_description: null } as any} />);
    expect(screen.queryByText("A guide to SEO best practices.")).not.toBeInTheDocument();
  });

  it("does not render AI model badge when absent", () => {
    render(<ContentEditor content={{ ...mockContent, ai_model_used: null } as any} />);
    expect(screen.queryByText("claude-3-sonnet")).not.toBeInTheDocument();
  });
});
