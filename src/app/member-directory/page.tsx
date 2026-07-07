import ProtectedRoute from "@/components/ProtectedRoute";
import MemberDirectory from "@/views/MemberDirectory";

export default function Page() {
  return (
    <ProtectedRoute>
      <MemberDirectory />
    </ProtectedRoute>
  );
}
