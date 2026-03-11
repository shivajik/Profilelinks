import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, FileDown, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type CsvEntry = { name: string; email: string; phone?: string; jobTitle?: string; branchId?: string };

type MemberData = {
  id: string;
  role: string;
  jobTitle?: string;
  status: string;
  businessName?: string;
  businessPhone?: string;
  branchId?: string;
  user: {
    id: string;
    username: string;
    email: string;
    displayName?: string;
    profileImage?: string;
  };
};

export function CsvImportExport({ teamId, teamSlug, members, branches: externalBranches }: {
  teamId: string;
  teamSlug?: string;
  members?: MemberData[];
  branches?: any[];
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [parsed, setParsed] = useState<CsvEntry[]>([]);
  const [results, setResults] = useState<any[] | null>(null);

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, "branches"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/branches`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: importOpen,
  });

  const bulkMut = useMutation({
    mutationFn: async (members: CsvEntry[]) => {
      const res = await apiRequest("POST", `/api/teams/${teamId}/members/bulk-invite`, { members });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "invites"] });
      toast({ title: "Bulk import completed!" });
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const parseCsv = (text: string): CsvEntry[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
    const nameIdx = headers.findIndex(h => ["name", "full name", "display name", "displayname"].includes(h));
    const emailIdx = headers.findIndex(h => ["email", "e-mail", "email address"].includes(h));
    const phoneIdx = headers.findIndex(h => ["phone", "mobile", "phone number", "mobile number", "contact"].includes(h));
    const jobIdx = headers.findIndex(h => ["job title", "jobtitle", "job_title", "title", "role", "position", "designation"].includes(h));

    if (emailIdx === -1) return [];

    return lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      return {
        name: nameIdx >= 0 ? cols[nameIdx] || "" : "",
        email: cols[emailIdx] || "",
        phone: phoneIdx >= 0 ? cols[phoneIdx] || "" : "",
        jobTitle: jobIdx >= 0 ? cols[jobIdx] || "" : "",
      };
    }).filter(e => e.email);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const entries = parseCsv(text);
      if (entries.length === 0) {
        toast({ title: "No valid entries found", description: "CSV must have an 'email' column header.", variant: "destructive" });
        return;
      }
      setParsed(entries);
      setResults(null);
      setImportOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const csv = "Name,Email,Phone,Job Title\nJohn Doe,john@example.com,+1234567890,Developer\nJane Smith,jane@example.com,+0987654321,Designer\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "team-invite-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const escapeCsvField = (value: string): string => {
    if (!value) return "";
    let safe = value;
    if (/^[=+\-@\t\r]/.test(safe)) {
      safe = "'" + safe;
    }
    if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };

  const exportMembers = () => {
    if (!members || members.length === 0) {
      toast({ title: "No members to export", variant: "destructive" });
      return;
    }

    const allBranches = externalBranches || branches || [];
    const branchMap = new Map(allBranches.map((b: any) => [b.id, b.name]));
    const origin = window.location.origin;

    const headers = ["Name", "Username", "Email", "Phone", "Job Title", "Role", "Status", "Branch", "Profile URL"];
    const rows = members.map((m) => {
      const name = m.businessName || m.user.displayName || m.user.username || "";
      const username = m.user.username || "";
      const email = m.user.email || "";
      const phone = m.businessPhone || "";
      const jobTitle = m.jobTitle || "";
      const role = m.role || "";
      const status = m.status || "";
      const branch = m.branchId ? (branchMap.get(m.branchId) || "") : "";
      const profileUrl = teamSlug
        ? `${origin}/${teamSlug}/${m.user.username}`
        : `${origin}/${m.user.username}`;

      return [name, username, email, phone, jobTitle, role, status, branch, profileUrl]
        .map(escapeCsvField)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: `Exported ${members.length} members` });
  };

  const updateBranch = (idx: number, branchId: string) => {
    const updated = [...parsed];
    updated[idx] = { ...updated[idx], branchId: branchId === "none" ? undefined : branchId };
    setParsed(updated);
  };

  return (
    <>
      <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleFile} />
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} data-testid="button-import-csv">
          <Upload className="w-4 h-4" /> Import Team
        </Button>
        <Button variant="ghost" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4" /> Sample Template
        </Button>
        <Button variant="outline" size="sm" onClick={exportMembers} data-testid="button-export-csv">
          <FileDown className="w-4 h-4" /> Export Team
        </Button>
      </div>

      <Dialog open={importOpen} onOpenChange={(v) => { if (!v) { setImportOpen(false); setParsed([]); setResults(null); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Team Members</DialogTitle>
            <DialogDescription>{results ? `${results.length} entries processed` : `${parsed.length} entries found in CSV`}</DialogDescription>
          </DialogHeader>

          {results ? (
            <div className="space-y-2">
              {results.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm border rounded-md px-3 py-2">
                  {r.status === "created" || r.status === "added" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : r.status === "skipped" ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive shrink-0" />
                  )}
                  <span className="flex-1 truncate">{r.email}</span>
                  <Badge variant={r.status === "created" || r.status === "added" ? "secondary" : "outline"}>
                    {r.status}
                  </Badge>
                  {r.error && <span className="text-xs text-muted-foreground">{r.error}</span>}
                </div>
              ))}
              <Button className="w-full" onClick={() => { setImportOpen(false); setParsed([]); setResults(null); }}>Done</Button>
            </div>
          ) : (
            <>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Job Title</TableHead>
                      {branches.length > 0 && <TableHead>Branch</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.slice(0, 50).map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{entry.name || "—"}</TableCell>
                        <TableCell className="text-sm">{entry.email}</TableCell>
                        <TableCell className="text-sm">{entry.phone || "—"}</TableCell>
                        <TableCell className="text-sm">{entry.jobTitle || "—"}</TableCell>
                        {branches.length > 0 && (
                          <TableCell>
                            <Select value={entry.branchId || "none"} onValueChange={(v) => updateBranch(i, v)}>
                              <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No branch</SelectItem>
                                {branches.map((b: any) => (
                                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsed.length > 50 && <p className="text-xs text-muted-foreground">Showing first 50 of {parsed.length}. Max 50 will be processed.</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setImportOpen(false); setParsed([]); }}>Cancel</Button>
                <Button disabled={bulkMut.isPending} onClick={() => bulkMut.mutate(parsed)}>
                  {bulkMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Invitations ({parsed.length})
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
