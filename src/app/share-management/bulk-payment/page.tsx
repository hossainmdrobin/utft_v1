import ProtectedRoute from "@/components/ProtectedRoute";
import BulkSharePayment from "@/views/BulkSharePayment";

export default function Page() {
  return (
    <ProtectedRoute>
      <BulkSharePayment />
    </ProtectedRoute>
  );
}
