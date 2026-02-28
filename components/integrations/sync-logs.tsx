"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { ApiRequestLog } from "@/types/database";

const PROVIDERS = ["all", "dataforseo", "otterly", "frase", "google"];

export function SyncLogs() {
  const [logs, setLogs] = useState<ApiRequestLog[]>([]);
  const [provider, setProvider] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("api_request_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (provider !== "all") {
        query = query.eq("provider", provider);
      }

      const { data } = await query;
      setLogs(data || []);
      setLoading(false);
    }

    fetchLogs();
  }, [provider]);

  const statusBadge = (code: number | null) => {
    if (!code) return <Badge variant="outline">N/A</Badge>;
    if (code >= 200 && code < 300)
      return <Badge className="bg-green-100 text-green-800">{code}</Badge>;
    if (code >= 400 && code < 500)
      return <Badge className="bg-yellow-100 text-yellow-800">{code}</Badge>;
    return <Badge className="bg-red-100 text-red-800">{code}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-medium">API Request Logs</h3>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p} value={p}>
                {p === "all" ? "All Providers" : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No request logs found.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.provider}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {log.endpoint}
                  </TableCell>
                  <TableCell>{statusBadge(log.status_code)}</TableCell>
                  <TableCell>
                    {log.response_time_ms ? `${log.response_time_ms}ms` : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
