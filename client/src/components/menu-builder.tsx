import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  UtensilsCrossed,
  Package,
  Shield,
  ImageIcon,
  Upload,
} from "lucide-react";
import { useLocation } from "wouter";

interface MenuSection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  position: number;
  active: boolean;
  createdAt: string;
}

interface MenuProduct {
  id: string;
  sectionId: string;
  userId: string;
  name: string;
  description: string | null;
  price: string | null;
  imageUrl: string | null;
  position: number;
  active: boolean;
  createdAt: string;
}

export function MenuBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: planLimits } = usePlanLimits();

  const [sectionDialog, setSectionDialog] = useState<{ open: boolean; section?: MenuSection }>({ open: false });
  const [productDialog, setProductDialog] = useState<{ open: boolean; sectionId?: string; product?: MenuProduct }>({ open: false });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Form state
  const [sectionName, setSectionName] = useState("");
  const [sectionDesc, setSectionDesc] = useState("");
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState("");

  const { data: sections = [], isLoading: sectionsLoading } = useQuery<MenuSection[]>({
    queryKey: ["/api/menu/sections"],
    enabled: !!user,
  });

  const { data: allProducts = [] } = useQuery<MenuProduct[]>({
    queryKey: ["/api/menu/products"],
    enabled: !!user,
  });

  const invalidateMenu = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/menu/sections"] });
    queryClient.invalidateQueries({ queryKey: ["/api/menu/products"] });
  };

  const createSectionMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      await apiRequest("POST", "/api/menu/sections", data);
    },
    onSuccess: () => {
      invalidateMenu();
      setSectionDialog({ open: false });
      toast({ title: "Section created!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; active?: boolean }) => {
      await apiRequest("PATCH", `/api/menu/sections/${id}`, data);
    },
    onSuccess: () => {
      invalidateMenu();
      setSectionDialog({ open: false });
      toast({ title: "Section updated!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/menu/sections/${id}`);
    },
    onSuccess: () => {
      invalidateMenu();
      toast({ title: "Section deleted!" });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: { sectionId: string; name: string; description?: string; price?: string; imageUrl?: string }) => {
      await apiRequest("POST", "/api/menu/products", data);
    },
    onSuccess: () => {
      invalidateMenu();
      setProductDialog({ open: false });
      toast({ title: "Product added!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; price?: string; imageUrl?: string; active?: boolean }) => {
      await apiRequest("PATCH", `/api/menu/products/${id}`, data);
    },
    onSuccess: () => {
      invalidateMenu();
      setProductDialog({ open: false });
      toast({ title: "Product updated!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/menu/products/${id}`);
    },
    onSuccess: () => {
      invalidateMenu();
      toast({ title: "Product deleted!" });
    },
  });

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
    if (!res.ok) throw new Error("Upload failed");
    const { url } = await res.json();
    setProductImage(url);
  };

  // Check if menu builder is enabled
  if (planLimits && !planLimits.menuBuilderEnabled) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Menu Builder — Locked</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Create digital menus with sections and products. Upgrade your plan to unlock this feature.
        </p>
        <Button onClick={() => navigate("/pricing")}>View Plans</Button>
      </div>
    );
  }

  const openNewSection = () => {
    setSectionName("");
    setSectionDesc("");
    setSectionDialog({ open: true });
  };

  const openEditSection = (section: MenuSection) => {
    setSectionName(section.name);
    setSectionDesc(section.description || "");
    setSectionDialog({ open: true, section });
  };

  const openNewProduct = (sectionId: string) => {
    setProductName("");
    setProductDesc("");
    setProductPrice("");
    setProductImage("");
    setProductDialog({ open: true, sectionId });
  };

  const openEditProduct = (product: MenuProduct) => {
    setProductName(product.name);
    setProductDesc(product.description || "");
    setProductPrice(product.price || "");
    setProductImage(product.imageUrl || "");
    setProductDialog({ open: true, sectionId: product.sectionId, product });
  };

  const submitSection = () => {
    if (sectionDialog.section) {
      updateSectionMutation.mutate({ id: sectionDialog.section.id, name: sectionName, description: sectionDesc });
    } else {
      createSectionMutation.mutate({ name: sectionName, description: sectionDesc });
    }
  };

  const submitProduct = () => {
    if (productDialog.product) {
      updateProductMutation.mutate({ id: productDialog.product.id, name: productName, description: productDesc, price: productPrice, imageUrl: productImage });
    } else if (productDialog.sectionId) {
      createProductMutation.mutate({ sectionId: productDialog.sectionId, name: productName, description: productDesc, price: productPrice, imageUrl: productImage });
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (sectionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Menu Builder</h2>
          <p className="text-sm text-muted-foreground">Create sections and add products to your digital menu</p>
        </div>
        <Button onClick={openNewSection} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Section
        </Button>
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UtensilsCrossed className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-base font-medium mb-1">No menu sections yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start by creating a section like "Appetizers" or "Main Course"</p>
            <Button onClick={openNewSection} variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Create First Section
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => {
            const sectionProducts = allProducts.filter(p => p.sectionId === section.id);
            const isExpanded = expandedSections[section.id] !== false; // default open
            return (
              <Card key={section.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleSection(section.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          <CardTitle className="text-sm font-medium">{section.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">{sectionProducts.length} items</Badge>
                          {!section.active && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={section.active}
                            onCheckedChange={(v) => updateSectionMutation.mutate({ id: section.id, active: v })}
                            className="scale-75"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSection(section)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                            if (confirm("Delete this section and all its products?")) deleteSectionMutation.mutate(section.id);
                          }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {section.description && <p className="text-xs text-muted-foreground mt-1 ml-6">{section.description}</p>}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-3">
                      {sectionProducts.length === 0 ? (
                        <div className="text-center py-4 border border-dashed rounded-md">
                          <p className="text-sm text-muted-foreground mb-2">No products in this section</p>
                          <Button variant="outline" size="sm" onClick={() => openNewProduct(section.id)}>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sectionProducts.map((product) => (
                            <div key={product.id} className="flex items-start gap-3 p-2 rounded-md border bg-background">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-md object-cover shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                                  <Package className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">{product.name}</span>
                                  {product.price && <span className="text-sm font-semibold text-primary shrink-0">{product.price}</span>}
                                  {!product.active && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                                </div>
                                {product.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Switch
                                  checked={product.active}
                                  onCheckedChange={(v) => updateProductMutation.mutate({ id: product.id, active: v })}
                                  className="scale-75"
                                />
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditProduct(product)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                                  if (confirm("Delete this product?")) deleteProductMutation.mutate(product.id);
                                }}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" className="w-full" onClick={() => openNewProduct(section.id)}>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Section Dialog */}
      <Dialog open={sectionDialog.open} onOpenChange={(v) => !v && setSectionDialog({ open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sectionDialog.section ? "Edit Section" : "New Section"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section Name *</Label>
              <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="e.g. Appetizers, Main Course" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={sectionDesc} onChange={(e) => setSectionDesc(e.target.value)} placeholder="Optional description" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog({ open: false })}>Cancel</Button>
            <Button onClick={submitSection} disabled={!sectionName.trim() || createSectionMutation.isPending || updateSectionMutation.isPending}>
              {(createSectionMutation.isPending || updateSectionMutation.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {sectionDialog.section ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialog.open} onOpenChange={(v) => !v && setProductDialog({ open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{productDialog.product ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name *</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Caesar Salad" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} placeholder="Brief description" rows={2} />
            </div>
            <div>
              <Label>Price</Label>
              <Input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="e.g. ₹299 or $12.99" />
            </div>
            <div>
              <Label>Image</Label>
              <div className="flex items-center gap-3">
                {productImage ? (
                  <img src={productImage} alt="Product" className="w-16 h-16 rounded-md object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    id="product-image-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("product-image-upload")?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1" /> Upload
                  </Button>
                  {productImage && (
                    <Button variant="ghost" size="sm" className="text-destructive ml-1" onClick={() => setProductImage("")}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog({ open: false })}>Cancel</Button>
            <Button onClick={submitProduct} disabled={!productName.trim() || createProductMutation.isPending || updateProductMutation.isPending}>
              {(createProductMutation.isPending || updateProductMutation.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {productDialog.product ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
