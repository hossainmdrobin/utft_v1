import ProtectedRoute from "@/components/ProtectedRoute";
import MemberDetails from "@/views/MemberDetails";

export default function Page() {
  return (
    <ProtectedRoute>
      <MemberDetails />
    </ProtectedRoute>
  );
}
