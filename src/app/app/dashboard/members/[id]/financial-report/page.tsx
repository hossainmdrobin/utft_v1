import ProtectedRoute from "@/components/ProtectedRoute";
import MemberFinancialReport from "@/views/MemberFinancialReport";

export default function Page() {
  return (
    <ProtectedRoute>
      <MemberFinancialReport />
    </ProtectedRoute>
  );
}
