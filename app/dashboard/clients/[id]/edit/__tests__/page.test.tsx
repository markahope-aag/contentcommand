// @ts-nocheck
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useParams: jest.fn(() => ({ id: "client-1" })),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(() => ({ toast: jest.fn() })),
}));

import EditClientPage from "@/app/dashboard/clients/[id]/edit/page";
import { createClient } from "@/lib/supabase/client";

const mockClient = {
  id: "client-1",
  name: "Acme Corp",
  domain: "acme.com",
  industry: "Technology",
  target_keywords: ["seo", "content"],
  brand_voice: "Professional",
};

function buildSupabase(clientData: any) {
  const chain = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: clientData, error: null }),
    update: jest.fn().mockReturnThis(),
  };
  chain.update.mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  });
  return chain;
}

describe("EditClientPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page heading", async () => {
    (createClient as jest.Mock).mockReturnValue(buildSupabase(mockClient));
    render(<EditClientPage />);
    await waitFor(() => {
      expect(screen.getByText(/edit client/i)).toBeInTheDocument();
    });
  });

  it("renders Name input field", async () => {
    (createClient as jest.Mock).mockReturnValue(buildSupabase(mockClient));
    render(<EditClientPage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });
  });

  it("renders Domain input field", async () => {
    (createClient as jest.Mock).mockReturnValue(buildSupabase(mockClient));
    render(<EditClientPage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument();
    });
  });

  it("populates form fields with loaded client data", async () => {
    (createClient as jest.Mock).mockReturnValue(buildSupabase(mockClient));
    render(<EditClientPage />);
    await waitFor(() => {
      const domainInput = screen.getByLabelText(/domain/i) as HTMLInputElement;
      expect(domainInput.value).toBe("acme.com");
    });
  });

  it("shows skeleton loading state initially", () => {
    // Mock a slow response to see loading state
    const chain = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnValue(new Promise(() => {})),
    };
    (createClient as jest.Mock).mockReturnValue(chain);

    render(<EditClientPage />);
    // Skeleton elements should be present during loading
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
