// @ts-nocheck
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BriefCard } from "@/components/content/brief-card";

// Mock next/link to avoid router issues
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const baseBrief = {
  id: "brief-1",
  title: "SEO Best Practices Guide",
  target_keyword: "seo best practices",
  status: "draft",
  priority_level: "high",
  content_type: "blog_post",
  target_word_count: 2000,
  client_id: "client-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("BriefCard", () => {
  it("renders the brief title", () => {
    render(<BriefCard brief={baseBrief as any} />);
    expect(screen.getByText("SEO Best Practices Guide")).toBeInTheDocument();
  });

  it("renders the target keyword", () => {
    render(<BriefCard brief={baseBrief as any} />);
    expect(screen.getByText("seo best practices")).toBeInTheDocument();
  });

  it("renders the status badge", () => {
    render(<BriefCard brief={baseBrief as any} />);
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("renders the priority badge", () => {
    render(<BriefCard brief={baseBrief as any} />);
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("renders content type when provided", () => {
    render(<BriefCard brief={baseBrief as any} />);
    expect(screen.getByText("blog post")).toBeInTheDocument();
  });

  it("renders target word count when provided", () => {
    render(<BriefCard brief={baseBrief as any} />);
    expect(screen.getByText("2000")).toBeInTheDocument();
  });

  it("does not render content type when not provided", () => {
    const brief = { ...baseBrief, content_type: null };
    render(<BriefCard brief={brief as any} />);
    expect(screen.queryByText("Type:")).not.toBeInTheDocument();
  });

  it("does not render word count when not provided", () => {
    const brief = { ...baseBrief, target_word_count: null };
    render(<BriefCard brief={brief as any} />);
    expect(screen.queryByText("Words:")).not.toBeInTheDocument();
  });

  it("renders View button always", () => {
    render(<BriefCard brief={baseBrief as any} />);
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
  });

  it("renders Approve button when status is draft and onApprove provided", () => {
    const onApprove = jest.fn();
    render(<BriefCard brief={baseBrief as any} onApprove={onApprove} />);
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });

  it("calls onApprove with brief id when Approve is clicked", () => {
    const onApprove = jest.fn();
    render(<BriefCard brief={baseBrief as any} onApprove={onApprove} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onApprove).toHaveBeenCalledWith("brief-1");
  });

  it("does not render Approve button when status is not draft", () => {
    const brief = { ...baseBrief, status: "approved" };
    render(<BriefCard brief={brief as any} onApprove={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("does not render Approve button when onApprove not provided", () => {
    render(<BriefCard brief={baseBrief as any} />);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("renders Generate Content button when status is approved and onGenerate provided", () => {
    const brief = { ...baseBrief, status: "approved" };
    const onGenerate = jest.fn();
    render(<BriefCard brief={brief as any} onGenerate={onGenerate} />);
    expect(screen.getByRole("button", { name: "Generate Content" })).toBeInTheDocument();
  });

  it("calls onGenerate with brief id when Generate Content is clicked", () => {
    const brief = { ...baseBrief, status: "approved" };
    const onGenerate = jest.fn();
    render(<BriefCard brief={brief as any} onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate Content" }));
    expect(onGenerate).toHaveBeenCalledWith("brief-1");
  });

  it("links title to brief detail page", () => {
    render(<BriefCard brief={baseBrief as any} />);
    const link = screen.getByRole("link", { name: "SEO Best Practices Guide" });
    expect(link).toHaveAttribute("href", "/dashboard/content/briefs/brief-1");
  });

  it("renders status with underscore replaced by space", () => {
    const brief = { ...baseBrief, status: "revision_requested" };
    render(<BriefCard brief={brief as any} />);
    expect(screen.getByText("revision requested")).toBeInTheDocument();
  });
});
