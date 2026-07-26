import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react'
import {
    Users,
    DollarSign,
    FileText,
    Settings,
    LayoutDashboard,
    Shield,
    Coins,
    CircleUserRound
} from "lucide-react";
import { cn } from '@/lib/utils';
import { useGetCurrentUserQuery } from '@/store/slices/authSlice/api.auth';
export const navigation = [
    { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, access: ["admin", "president", "director", "accountant", "auditor", "member"], adminOnly: false },
    { name: "Members", href: "/app/dashboard/members", icon: Users, access: ["admin", "president", "director"], adminOnly: false },
    { name: "Share Management", href: "/app/dashboard/share-management", icon: Coins, access: ["admin", "president", "director", "accountant", "auditor"], adminOnly: false },
    { name: "Accounting", href: "/app/dashboard/accounting", icon: DollarSign, access: ["admin", "president", "director", "accountant", "auditor"], adminOnly: false },
    { name: "Reports", href: "/app/dashboard/reports", icon: FileText, access: ["admin", "president", "director", "accountant", "auditor"], adminOnly: false },
    { name: "User Management", href: "/app/dashboard/user-management", icon: Shield, access: ["admin", "president", "director", "accountant", "auditor"], adminOnly: true },
    { name: "Profile", href: "/app/dashboard/profile", icon: CircleUserRound, access: ["admin", "president", "director", "accountant", "auditor", "member"], adminOnly: false },
    { name: "Settings", href: "/app/dashboard/settings", icon: Settings, access: ["admin", "president", "director", "accountant", "auditor", "member"], adminOnly: false },
    { name: "Settings(Employee)", href: "/app/dashboard/settings", icon: Settings, access: ["admin", "president", "director", "accountant", "auditor"], adminOnly: false },
];
export default function Sidebar({ setSidebarOpen }: { setSidebarOpen: (boolean) => void }) {
    const pathname = usePathname();
    const { data, isLoading } = useGetCurrentUserQuery();
    if (isLoading) return <div className='text-white'>Loading...</div>


    return (
        <>
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                    if (!item.access.includes(data.data.role)) return null;
                    console.log(item.name, data.role, item.access.includes(data.role))
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </>
    )
}
