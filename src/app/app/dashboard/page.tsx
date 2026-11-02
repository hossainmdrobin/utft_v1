'use client'
import Dashboard from "@/app/app/dashboard/Dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";

export default function Page() {
  const { data, isLoading, error } = useGetCurrentUserQuery();
  // console.log(data)
  return (
    <>
      {isLoading && (<div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>)
      }
      {data?.data?.role == "admin" && <Dashboard />}
    </>

  );
}
