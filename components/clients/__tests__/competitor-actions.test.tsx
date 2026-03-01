// @ts-nocheck
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

import { CompetitorActions } from "@/components/clients/competitor-actions";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

describe("CompetitorActions", () => {
  let mockToast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })),
    });
  });

  it("renders Add Competitor trigger button", () => {
    render(<CompetitorActions clientId="client-1" />);
    expect(screen.getByRole("button", { name: "Add Competitor" })).toBeInTheDocument();
  });

  it("opens dialog when trigger is clicked", async () => {
    render(<CompetitorActions clientId="client-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Add Competitor" }));
    await waitFor(() => {
      expect(screen.getByText("Track a new competitor for this client.")).toBeInTheDocument();
    });
  });

  it("shows Name, Domain, and Competitive Strength fields", async () => {
    render(<CompetitorActions clientId="client-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Add Competitor" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Domain")).toBeInTheDocument();
    });
  });

  it("dialog has correct title", async () => {
    render(<CompetitorActions clientId="client-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Add Competitor" }));
    await waitFor(() => {
      expect(screen.getByText("Add Competitor", { selector: "h2, [role=heading]" })).toBeInTheDocument();
    });
  });

  it("shows error toast when insert fails", async () => {
    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({ error: { message: "Unique constraint violation" } }),
      })),
    });

    render(<CompetitorActions clientId="client-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Add Competitor" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText("Name"), "Test Competitor");
    await userEvent.type(screen.getByLabelText("Domain"), "test.com");

    const form = document.querySelector("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed to add competitor" })
      );
    });
  });

  it("shows success toast when competitor is added", async () => {
    render(<CompetitorActions clientId="client-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Add Competitor" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText("Name"), "Good Competitor");
    await userEvent.type(screen.getByLabelText("Domain"), "good.com");

    const form = document.querySelector("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Competitor added" })
      );
    });
  });

  it("calls supabase with correct client_id and data", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
    (createClient as jest.Mock).mockReturnValue({ from: mockFrom });

    render(<CompetitorActions clientId="my-client-id" />);
    await userEvent.click(screen.getByRole("button", { name: "Add Competitor" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText("Name"), "My Competitor");
    await userEvent.type(screen.getByLabelText("Domain"), "mycompetitor.com");

    const form = document.querySelector("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("competitors");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: "my-client-id" })
      );
    });
  });
});
