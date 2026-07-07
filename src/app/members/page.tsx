import ProtectedRoute from "@/components/ProtectedRoute";
import Members from "@/views/Members";

export default function Page() {
  return (
    <ProtectedRoute>
      <Members />
    </ProtectedRoute>
  );
}
