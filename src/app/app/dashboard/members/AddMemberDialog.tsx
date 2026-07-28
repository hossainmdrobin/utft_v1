"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateMemberMutation } from "@/store/slices/memberSlice/api.member";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddMemberDialog({ open, onOpenChange, onSuccess }: AddMemberDialogProps) {
  const { toast } = useToast();
  const [uniqueCode, setUniqueCode] = useState("");
  const [member_type, setMemberType] = useState("general")
  const [password, setPassword] = useState("");
  const [share_quantity, setShare_quantity] = useState(0)
  const [joinDate, setJoinDate] = useState(new Date())
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const [createMember, { data, isLoading: loading, error }] = useCreateMemberMutation()

  useEffect(() => {
    const date = new Date(joinDate)
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    setUniqueCode(`${member_type == "founding" ? "FM" : "GM"}${dd}${mm}${yyyy}`)

  }, [joinDate, member_type])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setPassword("");
    }
  };

  useEffect(() => {
    if (data) {
      setShowSuccessDialog(true);
      onSuccess();
    }

    if (error) toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to create member"
    });
  }, [data, error])

  const handleCopy = () => {
    const text = `Unique Code: ${uniqueCode}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Create a new member account with a unique code and password. The member will be pending approval when he joins.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            createMember({ user_id: uniqueCode, member_type, share_quantity, role: "member", password, joinDate })
          }
          }
            className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unique_code">Member ID *</Label>
                <Input
                  id="unique_code"
                  value={uniqueCode}
                  onChange={(e) => setUniqueCode(e.target.value)}
                  placeholder="Enter unique code"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unique_code">Join Date</Label>
                <Input
                  id="joinDate"
                  type="date"
                  // value={String(joinDate)}
                  onChange={(e) => setJoinDate(new Date(e.target.value))}
                  placeholder="Enter unique code"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 6 characters)"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Share Quantity * </Label>
                <Input
                  id="share_quantity"
                  type="number"
                  value={share_quantity}
                  onChange={(e) => setShare_quantity(Number(e.target.value))}
                  placeholder="Share quantity"
                  defaultValue={0}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="member_type">Member Type *</Label>
                <Select value={member_type} onValueChange={(value) => setMemberType(value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="founding">Founding Member</SelectItem>
                    <SelectItem value="general">General Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Member Created</DialogTitle>
            <DialogDescription>
              Save the unique code and password below. They will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input value={uniqueCode} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input value={password} readOnly />
            </div>
            <Button className="w-full" onClick={handleCopy}>
              {copied ? <><Check className="mr-2 h-4 w-4" />Copied!</> : <><Copy className="mr-2 h-4 w-4" />Copy to Clipboard</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
