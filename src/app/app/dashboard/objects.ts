import { 
  Users, 
  DollarSign, 
  FileText, 
  Settings, 
  LayoutDashboard,
  Menu,
  X,
  Shield,
  Coins
} from "lucide-react";

export const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  { name: "Members", href: "/members", icon: Users, adminOnly: false },
  { name: "Share Management", href: "/share-management", icon: Coins, adminOnly: false },
  { name: "Accounting", href: "/accounting", icon: DollarSign, adminOnly: false },
  { name: "Reports", href: "/reports", icon: FileText, adminOnly: false },
  { name: "User Management", href: "/user-management", icon: Shield, adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, adminOnly: false },
];