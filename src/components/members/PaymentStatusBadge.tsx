import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertTriangle, AlertCircle } from "lucide-react";

interface PaymentStatusBadgeProps {
  status: "cleared" | "due" | "overdue" | "fine_applied" | string;
  showIcon?: boolean;
}

export function PaymentStatusBadge({ status, showIcon = true }: PaymentStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "due":
        return {
          label: "Due",
          variant: "secondary" as const,
          icon: Clock,
          className: "bg-yellow-500 hover:bg-yellow-600 text-white",
        };
      case "overdue":
        return {
          label: "Overdue",
          variant: "destructive" as const,
          icon: AlertTriangle,
          className: "",
        };
      case "fine_applied":
        return {
          label: "Fine Applied",
          variant: "destructive" as const,
          icon: AlertCircle,
          className: "bg-red-600 hover:bg-red-700",
        };
      case "cleared":
      default:
        // Don't show badge for cleared status
        return null;
    }
  };

  const config = getStatusConfig();
  
  if (!config) {
    return null;
  }
  
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

export function DonationStatusBadge({ status }: { status: string }) {
  const getConfig = () => {
    switch (status) {
      case "paid":
        return { label: "Paid", variant: "default" as const, className: "bg-green-500" };
      case "partial":
        return { label: "Partial", variant: "secondary" as const, className: "bg-yellow-500 text-white" };
      case "overdue":
        return { label: "Overdue", variant: "destructive" as const, className: "" };
      case "pending":
      default:
        return { label: "Pending", variant: "outline" as const, className: "" };
    }
  };

  const config = getConfig();

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
