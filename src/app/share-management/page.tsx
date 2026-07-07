import ProtectedRoute from "@/components/ProtectedRoute";
import ShareManagement from "@/views/ShareManagement";

export default function Page() {
  return (
    <ProtectedRoute>
      <ShareManagement />
    </ProtectedRoute>
  );
}
