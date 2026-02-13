import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useStore';
import { isAdmin } from '@/lib/admin';

/**
 * Route guard that protects admin-only pages.
 * Redirects unauthorized users to the home page.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore();

    if (!isAdmin(user)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
