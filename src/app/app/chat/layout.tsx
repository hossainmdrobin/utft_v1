'use client'
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useGetCurrentUserQuery, useLogoutMutation } from "@/store/slices/authSlice/api.auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
    children: ReactNode;
}


export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const { data: currentUserData } = useGetCurrentUserQuery();
    const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

    const currentUser = currentUserData?.data;

    return (
        <>
            <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 h-full">{children}</div>
            </div>
        </>
    );
}

