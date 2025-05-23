import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function ChangePasswordPage() {
  return (
    <ProtectedRoute> {/* Ensures user is logged in to change password */}
      <ChangePasswordForm />
    </ProtectedRoute>
  );
}
