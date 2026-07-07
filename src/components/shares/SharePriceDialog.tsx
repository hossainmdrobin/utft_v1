import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SharePriceDialogProps {
  currentPrice: number;
  onSuccess?: () => void;
}

export function SharePriceDialog({ currentPrice, onSuccess }: SharePriceDialogProps) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(currentPrice.toString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPrice(currentPrice.toString());
  }, [currentPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const priceValue = parseFloat(price);
      
      if (isNaN(priceValue) || priceValue <= 0) {
        toast.error("Please enter a valid price greater than zero");
        setLoading(false);
        return;
      }

      // Check if setting exists
      const { data: existing } = await supabase
        .from("trust_settings")
        .select("id")
        .eq("key", "share_price")
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("trust_settings")
          .update({ value: { amount: priceValue } })
          .eq("key", "share_price");
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("trust_settings")
          .insert({ key: "share_price", value: { amount: priceValue } });
        
        if (error) throw error;
      }

      toast.success(`Share price updated to ৳${priceValue.toLocaleString()}`);
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating share price:", error);
      toast.error(error.message || "Failed to update share price");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Share Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share Price Settings</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Price Per Share (৳)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price per share"
              required
            />
            <p className="text-xs text-muted-foreground">
              This price will be used when calculating new share receivables.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-lg font-bold">৳{currentPrice.toLocaleString()}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
