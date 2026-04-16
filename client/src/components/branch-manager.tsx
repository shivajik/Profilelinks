import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, MapPin, Phone, Mail, Building2 } from "lucide-react";

export function BranchManager({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isHead, setIsHead] = useState(false);

  const { data: branches = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, "branches"],
    queryFn: async () => {
      const res = await apiFetch(`/api/teams/${teamId}/branches`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", `/api/teams/${teamId}/branches`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "branches"] });
      resetForm();
      setCreateOpen(false);
      toast({ title: "Branch created!" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/branches/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "branches"] });
      setEditBranch(null);
      resetForm();
      toast({ title: "Branch updated!" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/teams/${teamId}/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "branches"] });
      setDeleteId(null);
      toast({ title: "Branch deleted" });
    },
  });

  const resetForm = () => {
    setName(""); setAddress(""); setPhone(""); setEmail(""); setIsHead(false);
  };

  const openEdit = (b: any) => {
    setEditBranch(b);
    setName(b.name); setAddress(b.address); setPhone(b.phone || ""); setEmail(b.email || ""); setIsHead(b.isHeadBranch);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Building2 className="w-4 h-4" /> Branch Addresses
        </h3>
        <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Branch
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : branches.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No branches yet. Add your head office and branch locations.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {branches.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{b.name}</span>
                      {b.isHeadBranch && <Badge variant="secondary" className="text-[10px]">Head Office</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" /> {b.address}
                    </div>
                    {b.phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="w-3 h-3 shrink-0" /> {b.phone}</div>}
                    {b.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3 h-3 shrink-0" /> {b.email}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen || !!editBranch} onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditBranch(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBranch ? "Edit Branch" : "Add Branch"}</DialogTitle>
            <DialogDescription>{editBranch ? "Update branch details." : "Add a new branch location."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Branch Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Head Office, Downtown Branch" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, Country" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555-0100" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="branch@company.com" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isHead} onCheckedChange={setIsHead} />
              <Label className="text-xs">Head Office / Main Branch</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setCreateOpen(false); setEditBranch(null); resetForm(); }}>Cancel</Button>
              <Button size="sm" disabled={!name.trim() || !address.trim() || createMut.isPending || updateMut.isPending}
                onClick={() => {
                  const data = { name, address, phone: phone || undefined, email: email || undefined, isHeadBranch: isHead };
                  if (editBranch) updateMut.mutate({ id: editBranch.id, data });
                  else createMut.mutate(data);
                }}>
                {(createMut.isPending || updateMut.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                {editBranch ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Branch</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Members assigned to this branch will be unassigned. Continue?</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={deleteMut.isPending} onClick={() => deleteId && deleteMut.mutate(deleteId)}>
              {deleteMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
