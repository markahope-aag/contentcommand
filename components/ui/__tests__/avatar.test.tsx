// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock Radix UI avatar to avoid complex rendering
/* eslint-disable react/display-name */
jest.mock("@radix-ui/react-avatar", () => ({
  Root: React.forwardRef(({ children, className, ...props }: any, ref: any) => (
    <div ref={ref} className={className} data-testid="avatar-root" {...props}>{children}</div>
  )),
  Image: React.forwardRef(({ className, src, alt, ...props }: any, ref: any) => (
    <img ref={ref} className={className} src={src} alt={alt} data-testid="avatar-image" {...props} />
  )),
  Fallback: React.forwardRef(({ children, className, ...props }: any, ref: any) => (
    <div ref={ref} className={className} data-testid="avatar-fallback" {...props}>{children}</div>
  )),
}));
/* eslint-enable react/display-name */

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

describe("Avatar", () => {
  it("renders avatar container", () => {
    render(<Avatar />);
    expect(screen.getByTestId("avatar-root")).toBeInTheDocument();
  });

  it("applies rounded-full class for circular shape", () => {
    render(<Avatar />);
    expect(screen.getByTestId("avatar-root")).toHaveClass("rounded-full");
  });

  it("applies custom className", () => {
    render(<Avatar className="custom-avatar" />);
    expect(screen.getByTestId("avatar-root")).toHaveClass("custom-avatar");
  });
});

describe("AvatarImage", () => {
  it("renders an img element", () => {
    render(
      <Avatar>
        <AvatarImage src="/avatar.jpg" alt="User Avatar" />
      </Avatar>
    );
    expect(screen.getByTestId("avatar-image")).toBeInTheDocument();
  });

  it("passes src and alt attributes", () => {
    render(
      <Avatar>
        <AvatarImage src="/user.png" alt="Profile Picture" />
      </Avatar>
    );
    const img = screen.getByTestId("avatar-image");
    expect(img).toHaveAttribute("src", "/user.png");
    expect(img).toHaveAttribute("alt", "Profile Picture");
  });

  it("applies aspect-square class", () => {
    render(
      <Avatar>
        <AvatarImage src="/test.jpg" alt="test" />
      </Avatar>
    );
    expect(screen.getByTestId("avatar-image")).toHaveClass("aspect-square");
  });
});

describe("AvatarFallback", () => {
  it("renders fallback content", () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("applies bg-muted class", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByTestId("avatar-fallback")).toHaveClass("bg-muted");
  });

  it("applies custom className", () => {
    render(
      <Avatar>
        <AvatarFallback className="custom-fallback">CD</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByTestId("avatar-fallback")).toHaveClass("custom-fallback");
  });
});

describe("Avatar composite usage", () => {
  it("renders complete avatar with image and fallback", () => {
    render(
      <Avatar>
        <AvatarImage src="/profile.jpg" alt="John Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByTestId("avatar-root")).toBeInTheDocument();
    expect(screen.getByTestId("avatar-image")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });
});
