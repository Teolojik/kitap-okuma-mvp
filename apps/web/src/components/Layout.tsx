
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useStore';
import { BookOpen, Search, User, LogOut, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout() {
    const signOut = useAuthStore(state => state.signOut);
    const location = useLocation();

    const navItems = [
        { href: '/', label: 'Kütüphanem', icon: Library },
        { href: '/discover', label: 'Keşfet', icon: Search },
        { href: '/profile', label: 'Profil', icon: User },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 border-r p-4 gap-4">
                <div className="flex items-center gap-2 px-2 py-4">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <span className="font-bold text-xl">KitapOkuma</span>
                </div>

                <nav className="flex-1 flex flex-col gap-2">
                    {navItems.map(item => (
                        <Link key={item.href} to={item.href}>
                            <Button
                                variant={location.pathname === item.href ? 'secondary' : 'ghost'}
                                className="w-full justify-start gap-2"
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Button>
                        </Link>
                    ))}
                </nav>

                <Button variant="outline" className="justify-start gap-2 text-red-500" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4" />
                    Çıkış
                </Button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto h-screen">
                <div className="container mx-auto p-4 md:p-8 max-w-7xl">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background p-2 flex justify-around items-center z-50">
                {navItems.map(item => (
                    <Link key={item.href} to={item.href} className="flex flex-col items-center p-2 text-xs text-muted-foreground hover:text-primary">
                        <item.icon className={`h-6 w-6 mb-1 ${location.pathname === item.href ? 'text-primary' : ''}`} />
                        {item.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
