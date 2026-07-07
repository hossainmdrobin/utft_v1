import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const REQUIRED_COLUMNS = ["full_name", "member_type", "share_quantity"];
const OPTIONAL_COLUMNS = [
  "father_name", "mother_name", "date_of_birth", "gender", "mobile", "email",
  "present_address", "permanent_address", "nid", "profession", "education",
  "nationality", "religion", "blood_group", "nominee_name", "nominee_relation",
  "nominee_nid", "form_no"
];

const COLUMN_ALIASES: Record<string, string> = {
  "Full Name": "full_name",
  "Father Name": "father_name",
  "Mother Name": "mother_name",
  "Date of Birth": "date_of_birth",
  "Member Type": "member_type",
  "Share Quantity": "share_quantity",
  "Present Address": "present_address",
  "Permanent Address": "permanent_address",
  "Blood Group": "blood_group",
  "Nominee Name": "nominee_name",
  "Nominee Relation": "nominee_relation",
  "Nominee NID": "nominee_nid",
  "Form No": "form_no",
  "Mobile": "mobile",
  "Email": "email",
  "Gender": "gender",
  "NID": "nid",
  "Profession": "profession",
  "Education": "education",
  "Nationality": "nationality",
  "Religion": "religion",
};

export function BulkUploadDialog({ open, onOpenChange, onSuccess }: BulkUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const normalizeColumnName = (name: string): string => {
    const trimmed = name.trim();
    return COLUMN_ALIASES[trimmed] || trimmed.toLowerCase().replace(/\s+/g, '_');
  };

  const validateHeaders = (headers: string[]): { valid: boolean; missing: string[]; normalized: Record<string, string> } => {
    const normalizedMap: Record<string, string> = {};
    headers.forEach(h => {
      normalizedMap[h] = normalizeColumnName(h);
    });

    const normalizedHeaders = Object.values(normalizedMap);
    const missing = REQUIRED_COLUMNS.filter(col => !normalizedHeaders.includes(col));

    return {
      valid: missing.length === 0,
      missing,
      normalized: normalizedMap
    };
  };

  const downloadTemplate = () => {
    const headers = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
    const sampleRow = {
      full_name: "John Doe",
      member_type: "general",
      share_quantity: "10",
      father_name: "Father Name",
      mother_name: "Mother Name",
      date_of_birth: "1990-01-01",
      gender: "male",
      mobile: "+8801234567890",
      email: "john@example.com",
      present_address: "Present Address",
      permanent_address: "Permanent Address",
      nid: "1234567890",
      profession: "Engineer",
      education: "Graduate",
      nationality: "Bangladeshi",
      religion: "Islam",
      blood_group: "A+",
      nominee_name: "Nominee Name",
      nominee_relation: "Spouse",
      nominee_nid: "0987654321",
      form_no: "F001"
    };

    const csv = Papa.unparse([sampleRow], { columns: headers });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "member_upload_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)"
      });
      return;
    }

    setUploading(true);
    setValidationErrors([]);

    if (isExcel) {
      toast({
        variant: "destructive",
        title: "Excel Support",
        description: "Please save your Excel file as CSV and upload again."
      });
      setUploading(false);
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const headers = results.meta.fields || [];
          const { valid, missing, normalized } = validateHeaders(headers);

          if (!valid) {
            setValidationErrors([
              `Missing required columns: ${missing.join(", ")}`,
              `Required columns are: ${REQUIRED_COLUMNS.join(", ")}`
            ]);
            setUploading(false);
            return;
          }

          const errors: string[] = [];
          const validMembers: any[] = [];

          results.data.forEach((row: any, index: number) => {
            // Normalize row keys
            const normalizedRow: Record<string, any> = {};
            Object.keys(row).forEach(key => {
              normalizedRow[normalized[key] || normalizeColumnName(key)] = row[key];
            });

            const fullName = (normalizedRow.full_name || "").trim();
            const memberType = (normalizedRow.member_type || "").toLowerCase().trim();
            const shareQty = parseInt(normalizedRow.share_quantity) || 0;

            // Validate required fields
            if (!fullName) {
              errors.push(`Row ${index + 2}: full_name is required`);
              return;
            }

            if (!["founding", "general"].includes(memberType)) {
              errors.push(`Row ${index + 2}: member_type must be 'founding' or 'general'`);
              return;
            }

            // Parse gender
            let gender = (normalizedRow.gender || "").toLowerCase().trim();
            if (gender && !["male", "female", "other"].includes(gender)) {
              gender = null;
            }

            // Parse date of birth
            let dateOfBirth = normalizedRow.date_of_birth || null;
            if (dateOfBirth && dateOfBirth.trim() === "") {
              dateOfBirth = null;
            }

            validMembers.push({
              full_name: fullName,
              father_name: normalizedRow.father_name || null,
              mother_name: normalizedRow.mother_name || null,
              date_of_birth: dateOfBirth,
              gender: gender || null,
              member_type: memberType as "founding" | "general",
              share_quantity: shareQty,
              mobile: normalizedRow.mobile || null,
              email: normalizedRow.email || null,
              present_address: normalizedRow.present_address || null,
              permanent_address: normalizedRow.permanent_address || null,
              nid: normalizedRow.nid || null,
              profession: normalizedRow.profession || null,
              education: normalizedRow.education || null,
              nationality: normalizedRow.nationality || null,
              religion: normalizedRow.religion || null,
              blood_group: normalizedRow.blood_group || null,
              nominee_name: normalizedRow.nominee_name || null,
              nominee_relation: normalizedRow.nominee_relation || null,
              nominee_nid: normalizedRow.nominee_nid || null,
              form_no: normalizedRow.form_no || null,
              status: 'pending' as const
            });
          });

          if (errors.length > 0) {
            setValidationErrors(errors.slice(0, 10));
            if (errors.length > 10) {
              setValidationErrors(prev => [...prev, `... and ${errors.length - 10} more errors`]);
            }
            setUploading(false);
            return;
          }

          if (validMembers.length === 0) {
            toast({
              variant: "destructive",
              title: "No Valid Data",
              description: "No valid member records found in the file."
            });
            setUploading(false);
            return;
          }

          // Insert valid members
          const { error } = await supabase
            .from("members")
            .insert(validMembers);

          if (error) throw error;

          toast({
            title: "Success",
            description: `Successfully uploaded ${validMembers.length} members`
          });
          
          setValidationErrors([]);
          onSuccess();
          onOpenChange(false);
        } catch (error: any) {
          console.error("Upload error:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Failed to upload members. Please check the file format."
          });
        } finally {
          setUploading(false);
        }
      },
      error: (error) => {
        console.error("Parse error:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to parse CSV file"
        });
        setUploading(false);
      }
    });

    // Reset input
    event.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with member information. Download the template below for the correct format.
          </p>

          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">Required columns:</p>
            <code className="bg-muted p-2 rounded text-xs">
              {REQUIRED_COLUMNS.join(", ")}
            </code>
          </div>

          <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Template CSV
          </Button>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {validationErrors.map((error, idx) => (
                    <p key={idx} className="text-xs">{error}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button asChild variant="default" disabled={uploading} className="flex-1">
              <label htmlFor="csv-upload" className="cursor-pointer flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Choose CSV File"}
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Supported formats: CSV (.csv). For Excel files, please save as CSV first.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}