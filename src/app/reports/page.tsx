import ProtectedRoute from "@/components/ProtectedRoute";
import Reports from "@/views/Reports";

export default function Page() {
  return (
    <ProtectedRoute>
      <Reports />
    </ProtectedRoute>
  );
}
