"use client";

import { useRouter } from "next/navigation";
import type { Client } from "@/types/database";

interface ClientSelectorProps {
  clients: Client[];
  selectedClientId: string;
}

export function ClientSelector({ clients, selectedClientId }: ClientSelectorProps) {
  const router = useRouter();

  return (
    <select
      value={selectedClientId}
      onChange={(e) => {
        router.push(`/dashboard/existing-content?clientId=${e.target.value}`);
      }}
      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </select>
  );
}
