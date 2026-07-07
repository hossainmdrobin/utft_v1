import ProtectedRoute from "@/components/ProtectedRoute";
import UserManagement from "@/views/UserManagement";

export default function Page() {
  return (
    <ProtectedRoute>
      <UserManagement />
    </ProtectedRoute>
  );
}
