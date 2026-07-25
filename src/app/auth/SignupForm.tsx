import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUpdateAuthUserMutation } from "@/store/slices/authSlice/api.auth";
import { useRouter } from "next/navigation";
interface SignupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editMember?: any;
  id:string
}

export default function SignupForm({ open, onOpenChange, onSuccess, editMember,id }: SignupFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [updateAuthUser, {data:updatedData, isLoading: updateLoading }] = useUpdateAuthUserMutation();
  console.log(updatedData,"updatedData")
  const route = useRouter();
  const [formData, setFormData] = useState({
    form_no: "",
    full_name: "",
    father_name: "",
    mother_name: "",
    date_of_birth: "",
    gender: "",
    profession: "",
    nationality: "",
    religion: "",
    blood_group: "",
    education: "",
    present_address: "",
    permanent_address: "",
    nid: "",
    mobile: "",
    email: "",
    share_quantity: "0",
    nominee_name: "",
    nominee_relation: "",
    nominee_nid: ""
  });

  useEffect(() => {
    if (editMember && open) {
      setFormData({
        form_no: editMember.form_no || "",
        full_name: editMember.full_name || "",
        father_name: editMember.father_name || "",
        mother_name: editMember.mother_name || "",
        date_of_birth: editMember.date_of_birth || "",
        gender: editMember.gender || "",
        profession: editMember.profession || "",
        nationality: editMember.nationality || "",
        religion: editMember.religion || "",
        blood_group: editMember.blood_group || "",
        education: editMember.education || "",
        present_address: editMember.present_address || "",
        permanent_address: editMember.permanent_address || "",
        nid: editMember.nid || "",
        mobile: editMember.mobile || "",
        email: editMember.email || "",
        share_quantity: String(editMember.share_quantity || 0),
        nominee_name: editMember.nominee_name || "",
        nominee_relation: editMember.nominee_relation || "",
        nominee_nid: editMember.nominee_nid || ""
      });
    } else if (!open) {
      setFormData({
        form_no: "",
        full_name: "",
        father_name: "",
        mother_name: "",
        date_of_birth: "",
        gender: "",
        profession: "",
        nationality: "",
        religion: "",
        blood_group: "",
        education: "",
        present_address: "",
        permanent_address: "",
        nid: "",
        mobile: "",
        email: "",
        share_quantity: "0",
        nominee_name: "",
        nominee_relation: "",
        nominee_nid: ""
      });
    }
  }, [editMember, open]);

  useEffect(()=>{
    if(updatedData) route.push("/dashboard")

  },[updatedData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateAuthUser({user_id:id,data:formData});
    // setLoading(true);

    // try {
    //   // Validate form data with Zod
    //   const validationResult = memberSchema.safeParse({
    //     ...formData,
    //     share_quantity: Number(formData.share_quantity),
    //   });

    //   if (!validationResult.success) {
    //     const firstError = validationResult.error.errors[0];
    //     toast({
    //       title: "Validation Error",
    //       description: firstError.message,
    //       variant: "destructive",
    //     });
    //     setLoading(false);
    //     return;
    //   }

    //   const updateData: any = {
    //     form_no: formData.form_no || null,
    //     full_name: formData.full_name,
    //     father_name: formData.father_name || null,
    //     mother_name: formData.mother_name || null,
    //     date_of_birth: formData.date_of_birth || null,
    //     profession: formData.profession || null,
    //     nationality: formData.nationality || null,
    //     religion: formData.religion || null,
    //     blood_group: formData.blood_group || null,
    //     education: formData.education || null,
    //     present_address: formData.present_address || null,
    //     permanent_address: formData.permanent_address || null,
    //     nid: formData.nid || null,
    //     mobile: formData.mobile || null,
    //     email: formData.email || null,
    //     share_quantity: parseInt(formData.share_quantity) || 0,
    //     nominee_name: formData.nominee_name || null,
    //     nominee_relation: formData.nominee_relation || null,
    //     nominee_nid: formData.nominee_nid || null,
    //   };

    //   if (formData.gender) {
    //     updateData.gender = formData.gender;
    //   }

    //   if (editMember) {
    //     const { error } = await supabase
    //       .from("members")
    //       .update(updateData)
    //       .eq("id", editMember.id);

    //     if (error) {
    //       toast({
    //         variant: "destructive",
    //         title: "Error",
    //         description: error.message
    //       });
    //     } else {
    //       toast({
    //         title: "Success",
    //         description: "Member updated successfully"
    //       });
    //       onSuccess();
    //       onOpenChange(false);
    //     }
    //   } else {
    //     const insertData = {
    //       ...updateData,
    //       status: 'pending' as const
    //     };

    //     const { error } = await supabase.from("members").insert([insertData]);

    //     if (error) {
    //       toast({
    //         variant: "destructive",
    //         title: "Error",
    //         description: error.message
    //       });
    //     } else {
    //       toast({
    //         title: "Success",
    //         description: "Member added successfully and pending approval"
    //       });
    //       onSuccess();
    //       onOpenChange(false);
    //     }
    //   }

    //   setLoading(false);
    // } catch (error: any) {
    //   toast({
    //     title: "Error",
    //     description: error.message,
    //     variant: "destructive",
    //   });
    //   setLoading(false);
    // }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
          <DialogDescription>
            {editMember ? 'Update member information.' : 'Enter member information. The member will be pending approval.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form_no">Form No</Label>
                <Input
                  id="form_no"
                  value={formData.form_no}
                  onChange={(e) => handleChange("form_no", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="father_name">Father's Name</Label>
                <Input
                  id="father_name"
                  value={formData.father_name}
                  onChange={(e) => handleChange("father_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mother_name">Mother's Name</Label>
                <Input
                  id="mother_name"
                  value={formData.mother_name}
                  onChange={(e) => handleChange("mother_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange("date_of_birth", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">Profession</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => handleChange("profession", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => handleChange("nationality", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="religion">Religion</Label>
                <Input
                  id="religion"
                  value={formData.religion}
                  onChange={(e) => handleChange("religion", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blood_group">Blood Group</Label>
                <Select value={formData.blood_group} onValueChange={(value) => handleChange("blood_group", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={formData.education}
                  onChange={(e) => handleChange("education", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="present_address">Present Address</Label>
                <Textarea
                  id="present_address"
                  value={formData.present_address}
                  onChange={(e) => handleChange("present_address", e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="permanent_address">Permanent Address</Label>
                <Textarea
                  id="permanent_address"
                  value={formData.permanent_address}
                  onChange={(e) => handleChange("permanent_address", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nid">NID</Label>
                <Input
                  id="nid"
                  value={formData.nid}
                  onChange={(e) => handleChange("nid", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleChange("mobile", e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Membership Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Membership Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="share_quantity">Share Quantity</Label>
                <Input
                  id="share_quantity"
                  type="number"
                  min="0"
                  value={formData.share_quantity}
                  onChange={(e) => handleChange("share_quantity", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Nominee Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Nominee Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nominee_name">Nominee Name</Label>
                <Input
                  id="nominee_name"
                  value={formData.nominee_name}
                  onChange={(e) => handleChange("nominee_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nominee_relation">Nominee Relation</Label>
                <Input
                  id="nominee_relation"
                  value={formData.nominee_relation}
                  onChange={(e) => handleChange("nominee_relation", e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="nominee_nid">Nominee NID</Label>
                <Input
                  id="nominee_nid"
                  value={formData.nominee_nid}
                  onChange={(e) => handleChange("nominee_nid", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
