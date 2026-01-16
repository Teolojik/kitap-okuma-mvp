import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useStore';
import { Home, Library, Clock, Bookmark, Settings, LogOut, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout() {
    const signOut = useAuthStore(state => state.signOut);
    const location = useLocation();

    const navItems = [
        { href: '/', label: 'Anasayfa', icon: Home },
        { href: '/discover', label: 'Keşfet', icon: Library },
        { href: '/profile', label: 'Profil', icon: Bookmark },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans selection:bg-primary/20 selection:text-primary">
            {/* Slim Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-20 border-r border-border/50 bg-card/10 p-4 gap-8 items-center py-8">
                <div className="mb-4">
                    <Hand className="h-8 w-8 text-foreground/80 cursor-pointer hover:scale-110 transition-transform" />
                </div>

                <nav className="flex-1 flex flex-col gap-6">
                    {navItems.map(item => (
                        <Link key={item.href} to={item.href} title={item.label}>
                            <div className={`p-3 rounded-2xl transition-all duration-300 group ${location.pathname === item.href
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                : 'text-muted-foreground hover:bg-secondary'
                                }`}>
                                <item.icon className="h-5 w-5" />
                            </div>
                        </Link>
                    ))}
                </nav>

                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                    onClick={() => signOut()}
                    title="Çıkış Yap"
                >
                    <LogOut className="h-5 w-5" />
                </Button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto h-screen relative">
                <div className="container mx-auto p-4 md:p-12 max-w-7xl">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg p-2 flex justify-around items-center z-50">
                {navItems.slice(0, 4).map(item => (
                    <Link key={item.href} to={item.href} className="flex flex-col items-center p-2 text-xs text-muted-foreground hover:text-primary">
                        <item.icon className={`h-6 w-6 mb-1 ${location.pathname === item.href ? 'text-primary' : ''}`} />
                    </Link>
                ))}
                <button onClick={() => signOut()} className="p-2">
                    <LogOut className="h-6 w-6 text-muted-foreground" />
                </button>
            </nav>
        </div>
    );
}
