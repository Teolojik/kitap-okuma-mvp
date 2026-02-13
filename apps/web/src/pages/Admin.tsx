
import React, { useState, useEffect } from 'react';
import { useBookStore, useAuthStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/translations';
import {
    Users,
    BookOpen,
    BarChart3,
    Settings as SettingsIcon,
    ShieldCheck,
    Trash2,
    Search,
    ChevronRight,
    Loader2,
    TrendingUp,
    Database,
    RotateCcw,
    History,
    CircleSlash,
    Megaphone,
    X,
    LifeBuoy,
    MessageSquare,
    CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

const AdminPage = () => {
    const { settings, books } = useBookStore();
    const { user } = useAuthStore();
    const t = useTranslation(settings.language);
    const [isLoading, setIsLoading] = useState(true);
    const [systemSettings, setSystemSettings] = useState({
        maintenance_mode: false,
        allow_signups: true
    });
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalBooks: 0,
        activeReads: 0,
        storageUsed: "0 MB"
    });
    const [usersList, setUsersList] = useState<any[]>([]);
    const [allBooks, setAllBooks] = useState<any[]>([]);
    const [adminLogs, setAdminLogs] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info', expires_at: '' });
    const [supportTickets, setSupportTickets] = useState<any[]>([]);
    const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
    const [chartData, setChartData] = useState<any[]>([]);
    const [insights, setInsights] = useState({
        popularBooks: [] as any[],
        topReadBooks: [] as any[]
    });
    const [isScanningStorage, setIsScanningStorage] = useState(false);
    const [orphanFiles, setOrphanFiles] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [bookSearchQuery, setBookSearchQuery] = useState('');
    const [userFilter, setUserFilter] = useState<'all' | 'admins'>('all');
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null); // Track specific actions
    const [userPage, setUserPage] = useState(1);
    const [bookPage, setBookPage] = useState(1);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
    const ITEMS_PER_PAGE = 8;

    const fetchAdminData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Total Books & Storage (Sorted by latest)
            const { data: booksData, error: bookError } = await supabase
                .from('books')
                .select('*')
                .order('created_at', { ascending: false });

            if (bookError) throw bookError;

            // 2. Fetch Users (Sorted by latest)
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;

            // 3. Fetch System Settings
            const { data: settingsData } = await supabase
                .from('system_settings')
                .select('*');

            const settingsMap = (settingsData || []).reduce((acc: any, curr: any) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});

            setSystemSettings(prev => ({
                ...prev,
                ...settingsMap
            }));

            // Calc Storage
            const totalBytes = (booksData || []).reduce((acc, b) => acc + (b.file_size || 0), 0);
            const storageStr = totalBytes > 1024 * 1024 * 1024
                ? `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
                : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;

            setStats({
                totalUsers: usersData?.length || 0,
                totalBooks: booksData?.length || 0,
                activeReads: 0, // Real-time session tracking to be implemented
                storageUsed: storageStr
            });

            if (usersData) {
                // Enrich users data with fallback logic if needed
                const enrichedUsers = usersData.map(u => ({
                    ...u,
                    // If e-mail is missing in profile, it's a structural or sync issue
                    display_name: u.name || u.full_name || (u.email ? u.email.split('@')[0] : t('anonymousUser')),
                    display_email: u.email || t('noEmail')
                }));
                setUsersList(enrichedUsers);
            }
            if (booksData) setAllBooks(booksData);

        } catch (error) {
            console.error("Admin fetch error:", error);
            toast.error(t('adminFetchError'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
        fetchLogs();
        fetchAnnouncements();
        fetchTickets();
    }, []);

    useEffect(() => {
        if (usersList.length > 0) {
            let days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

            const range = [...Array(days)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const data = range.map(date => {
                const count = usersList.filter(u =>
                    u.created_at && u.created_at.split('T')[0] === date
                ).length;
                return {
                    name: days > 7
                        ? new Date(date).toLocaleDateString(settings.language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' })
                        : new Date(date).toLocaleDateString(settings.language === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short' }),
                    users: count
                };
            });
            setChartData(data);
        }
    }, [usersList, settings.language, timeRange]);

    useEffect(() => {
        if (allBooks.length > 0 && usersList.length > 0) {
            calculateInsights();
        }
    }, [allBooks, usersList]);

    const calculateInsights = () => {
        // 1. Popular Books (by title frequency)
        const bookCounts: Record<string, { count: number; author: string }> = {};
        allBooks.forEach(b => {
            const title = b.title || 'Unknown';
            if (!bookCounts[title]) bookCounts[title] = { count: 0, author: b.author || 'Unknown' };
            bookCounts[title].count++;
        });
        const popular = Object.entries(bookCounts)
            .map(([title, data]) => ({ title, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // 2. Most Read Books (aggregate time spent from user stats)
        const timeMap: Record<string, { totalTime: number; author: string }> = {};
        usersList.forEach(user => {
            const userStats = user.stats || {};
            const bookTime = userStats.bookTime || {};
            Object.entries(bookTime).forEach(([bookId, seconds]) => {
                // Find book title for this bookId
                const book = allBooks.find(b => b.id === bookId);
                const title = book?.title || 'Unknown';
                if (!timeMap[title]) timeMap[title] = { totalTime: 0, author: book?.author || 'Unknown' };
                timeMap[title].totalTime += (seconds as number);
            });
        });
        const topRead = Object.entries(timeMap)
            .map(([title, data]) => ({ title, ...data }))
            .sort((a, b) => b.totalTime - a.totalTime)
            .slice(0, 10);

        setInsights({
            popularBooks: popular,
            topReadBooks: topRead
        });
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString(settings.language === 'tr' ? 'tr-TR' : 'en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredUsers = usersList.filter(u => {
        const matchesSearch =
            (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.display_email || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter = userFilter === 'all' || (u.role || '').toLowerCase() === 'admin';

        return matchesSearch && matchesFilter;
    });

    const fetchTickets = async () => {
        const { data } = await supabase
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setSupportTickets(data);
    };

    const fetchAnnouncements = async () => {
        const { data } = await supabase
            .from('system_announcements')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setAnnouncements(data);
    };

    const fetchLogs = async () => {
        const { data } = await supabase
            .from('admin_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (data) setAdminLogs(data);
    };

    const createLog = async (action: string, targetId: string, targetName: string, details?: any) => {
        try {
            await supabase.from('admin_logs').insert({
                admin_email: user?.email,
                action,
                target_id: targetId,
                target_name: targetName,
                details: details || {}
            });
            fetchLogs();
        } catch (err) {
            console.error("Log error:", err);
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!newAnnouncement.title || !newAnnouncement.message) {
            toast.error(t('fillAllFields'));
            return;
        }

        setIsActionLoading('createAnnouncement');
        try {
            const { error } = await supabase
                .from('system_announcements')
                .insert({
                    ...newAnnouncement,
                    created_by: user?.email,
                    expires_at: newAnnouncement.expires_at || null
                });

            if (error) throw error;

            toast.success(t('announcementPublished'));
            setNewAnnouncement({ title: '', message: '', type: 'info', expires_at: '' });
            fetchAnnouncements();
            createLog('CREATE_ANNOUNCEMENT', 'ALL', newAnnouncement.title);
        } catch (error) {
            console.error(error);
            toast.error(t('failedAdminAction'));
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        try {
            const { error } = await supabase
                .from('system_announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success(t('announcementRemoved'));
            fetchAnnouncements();
            createLog('DELETE_ANNOUNCEMENT', id, 'System Announcement');
        } catch (error) {
            console.error(error);
            toast.error(t('failedAdminAction'));
        }
    };

    const handleSendTicketReply = async (ticketId: string) => {
        const reply = ticketReplies[ticketId];
        if (!reply) return;

        setIsActionLoading(`reply_${ticketId}`);
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({
                    admin_reply: reply,
                    status: 'resolved'
                })
                .eq('id', ticketId);

            if (error) throw error;

            toast.success(t('ticketReplied'));
            fetchTickets();
            const ticket = supportTickets.find(t => t.id === ticketId);
            createLog('REPLY_TICKET', ticketId, ticket?.subject || 'Support Ticket', { reply });
            setTicketReplies(prev => {
                const updated = { ...prev };
                delete updated[ticketId];
                return updated;
            });
        } catch (error) {
            console.error(error);
            toast.error(t('failedAdminAction'));
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({ status: newStatus })
                .eq('id', ticketId);

            if (error) throw error;

            toast.success(t('ticketStatusUpdated'));
            fetchTickets();
            const tkt = supportTickets.find(t => t.id === ticketId);
            createLog('UPDATE_TICKET', ticketId, tkt?.subject || 'Support Ticket', { newStatus });
        } catch (error) {
            console.error(error);
            toast.error(t('failedAdminAction'));
        }
    };

    const handleDeleteTicket = async (ticketId: string) => {
        if (!window.confirm(t('confirmDeleteTicket'))) return;

        try {
            const { error } = await supabase
                .from('support_tickets')
                .delete()
                .eq('id', ticketId);

            if (error) throw error;

            toast.success(t('ticketDeleted'));
            fetchTickets();
            createLog('DELETE_TICKET', ticketId, 'Support Ticket');
        } catch (error) {
            console.error(error);
            toast.error(t('failedAdminAction'));
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (userId === user?.id) {
            toast.error("You cannot delete your own admin account.");
            return;
        }

        if (!window.confirm(t('confirmDeleteUser') + " (This will permanently delete all user data including auth account)")) return;

        setIsActionLoading(`delete_user_${userId}`);
        try {
            // 1. Delete user's books (DB entries) first due to foreign keys
            await supabase.from('books').delete().eq('user_id', userId);

            // 2. Delete user's support tickets
            await supabase.from('support_tickets').delete().eq('user_email', usersList.find(u => u.id === userId)?.email);

            // 3. Delete profile
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            // 4. Try to delete from auth.users via Edge Function (optional, may fail if not deployed)
            try {
                await supabase.functions.invoke('admin-operations', {
                    body: { action: 'delete_user', userId }
                });
            } catch (edgeFnError) {
                console.warn('Edge Function not available, auth.users entry remains:', edgeFnError);
                // Continue anyway - profile is deleted
            }

            toast.success(t('userDeleted'));
            fetchAdminData();
            createLog('DELETE_USER', userId, 'User Profile + Auth Account');
        } catch (error) {
            console.error(error);
            toast.error(t('failedAdminAction'));
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', userId);

            if (error) throw error;

            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            toast.success(t('successStatusUpdate'));
            const u = usersList.find(x => x.id === userId);
            createLog(newStatus === 'Banned' ? 'BAN_USER' : 'UNBAN_USER', userId, u?.name || u?.email);
        } catch (error) {
            console.error("Update status error:", error);
            toast.error(t('failedAdminAction'));
        }
    };

    const handleScanStorage = async () => {
        setIsScanningStorage(true);
        setOrphanFiles([]);
        try {
            // 1. Get all file paths from DB
            const dbFilePaths = allBooks.map(b => {
                // Extracts "user-id/filename.ext" from URL
                const parts = (b.file_url || '').split('/');
                const fileName = parts.pop();
                const userId = parts.pop();
                return `${userId}/${fileName}`;
            });

            // 2. List all folders in storage (user ids)
            const { data: userFolders } = await supabase.storage.from('books').list();

            let allStorageFiles: string[] = [];
            if (userFolders) {
                for (const folder of userFolders) {
                    const { data: files } = await supabase.storage.from('books').list(folder.name);
                    if (files) {
                        files.forEach(f => {
                            if (f.name !== '.emptyFolderPlaceholder') {
                                allStorageFiles.push(`${folder.name}/${f.name}`);
                            }
                        });
                    }
                }
            }

            // 3. Compare
            const orphans = allStorageFiles.filter(path => !dbFilePaths.includes(path));
            setOrphanFiles(orphans);

            if (orphans.length === 0) {
                toast.success(t('noOrphans'));
            } else {
                toast.warning(t('orphansFound', { count: orphans.length }));
            }
        } catch (error) {
            console.error(error);
            toast.error(t('scanStorageFailed'));
        } finally {
            setIsScanningStorage(false);
        }
    };

    const handleDeleteOrphans = async () => {
        if (!window.confirm(t('confirmDeleteOrphans', { count: orphanFiles.length }))) return;

        try {
            const { error } = await supabase.storage.from('books').remove(orphanFiles);
            if (error) throw error;

            toast.success(t('orphansDeleted'));
            createLog('STORAGE_CLEANUP', 'BATCH', 'Multiple Files', { count: orphanFiles.length });
            setOrphanFiles([]);
        } catch (error) {
            console.error(error);
            toast.error(t('cleanupFailed'));
        }
    };

    const handleUpdateUserRole = async (userId: string, newRole: string) => {
        try {
            // 1. Update profile table
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            // 2. Sync to auth.users metadata via Edge Function (optional)
            try {
                await supabase.functions.invoke('admin-operations', {
                    body: { action: 'update_role', userId, role: newRole }
                });
            } catch (edgeFnError) {
                console.warn('Edge Function not available, auth metadata not synced:', edgeFnError);
                // Continue anyway - profile is updated
            }

            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            toast.success(t('successRoleUpdate'));
            const u = usersList.find(x => x.id === userId);
            createLog('CHANGE_ROLE', userId, u?.name || u?.email, { newRole });
        } catch (error) {
            console.error("Update role error:", error);
            toast.error(t('failedAdminAction'));
        }
    };

    const handleDeleteBook = async (bookId: string) => {
        if (!confirm(t('confirmDeleteBook'))) return;

        try {
            const bookToDelete = allBooks.find(x => x.id === bookId);

            // 1. Storage'dan dosyayı sil (Eğer URL varsa)
            if (bookToDelete?.file_url) {
                const urlParts = bookToDelete.file_url.split('/');
                const fileName = urlParts.pop();
                const userId = urlParts.pop();
                const storagePath = `${userId}/${fileName}`;

                await supabase.storage.from('books').remove([storagePath]);
            }

            // 2. DB'den sil
            const { error } = await supabase
                .from('books')
                .delete()
                .eq('id', bookId);

            if (error) throw error;

            setAllBooks(prev => prev.filter(b => b.id !== bookId));
            setStats(prev => ({ ...prev, totalBooks: prev.totalBooks - 1 }));
            toast.success(t('bookDeleted'));
            createLog('DELETE_BOOK', bookId, bookToDelete?.title || 'Unknown');
        } catch (error) {
            console.error("Delete book error:", error);
            toast.error(t('failedAdminAction'));
        }
    };

    const handleUpdateSystemSetting = async (key: string, value: any) => {
        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert({ key, value }, { onConflict: 'key' });

            if (error) throw error;

            setSystemSettings(prev => ({ ...prev, [key]: value }));
            toast.success(t('settingsSaved'));
        } catch (error) {
            console.error("Update setting error:", error);
            toast.error(t('failedAdminAction'));
        }
    };

    const handleExportDB = () => {
        const fullBackup = {
            exportDate: new Date().toISOString(),
            platform: 'Epigraph',
            users: usersList,
            books: allBooks,
            settings: systemSettings
        };

        const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `epigraph_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t('exportSuccess'));
    };

    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="font-black uppercase tracking-widest text-muted-foreground animate-pulse">
                    {t('loading')}
                </p>
            </div>
        );
    }

    // Access control
    const isAdmin = user?.user_metadata?.role === 'admin' ||
        user?.email === 'support@epigraph.app' ||
        user?.email === 'blocking_saxsafon@hotmail.com';
    if (!isAdmin) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    <div className="h-24 w-24 rounded-[2.5rem] bg-red-500/10 flex items-center justify-center relative z-10">
                        <ShieldCheck className="h-12 w-12 text-red-500" />
                    </div>
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight">{t('adminAccessDenied')}</h1>
                    <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                        {t('restrictedAreaDesc')}
                    </p>
                </div>
                <Button onClick={() => window.location.href = '/'} className="rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                    <ChevronRight className="h-4 w-4 rotate-180" /> {t('backToDashboard')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2 text-left">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
                            {t('adminTitle')}
                        </h1>
                    </div>
                    <p className="text-muted-foreground font-medium text-xl opacity-60">
                        {t('adminManageAllBooks')}
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={handleExportDB}
                        variant="outline"
                        className="rounded-2xl h-12 px-6 gap-2 border-primary/20 hover:bg-primary/5"
                    >
                        <Database className="h-4 w-4" /> {t('exportDB')}
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: t('totalUsers'), value: stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: t('totalLibrary'), value: stats.totalBooks, icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    { label: t('activeSessions'), value: stats.activeReads, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
                    { label: t('storageUsage'), value: stats.storageUsed, icon: Database, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                ].map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card className="border-border/50 bg-card/30 backdrop-blur-xl hover:bg-card/50 transition-all group overflow-hidden relative">
                            <CardContent className="p-6">
                                <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform shadow-sm`}>
                                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{stat.label}</p>
                                    <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Tabs Content */}
            <Tabs defaultValue="dashboard" className="space-y-8">
                <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide md:overflow-visible touch-pan-x">
                    <TabsList className="bg-secondary/20 p-1 rounded-3xl h-16 border border-border/40 backdrop-blur-md inline-flex min-w-max md:flex">
                        <TabsTrigger value="dashboard" className="rounded-2xl px-8 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] gap-2">
                            <BarChart3 className="h-4 w-4" /> {t('adminDashboardTab')}
                        </TabsTrigger>
                        <TabsTrigger value="users" className="rounded-2xl px-8 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] gap-2">
                            <Users className="h-4 w-4" /> {t('adminUsersTab')}
                        </TabsTrigger>
                        <TabsTrigger value="content" className="rounded-2xl px-8 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] gap-2">
                            <BookOpen className="h-4 w-4" /> {t('adminContentTab')}
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="rounded-2xl px-8 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] gap-2">
                            <History className="h-4 w-4" /> {t('adminActivityTab')}
                        </TabsTrigger>
                        <TabsTrigger value="announcements" className="rounded-2xl px-8 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] gap-2">
                            <Megaphone className="h-4 w-4" /> {t('adminAnnouncementsTab')}
                        </TabsTrigger>
                        <TabsTrigger value="insights" className="rounded-2xl px-8 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] gap-2">
                            <TrendingUp className="h-4 w-4" /> {t('adminInsightsTab')}
                        </TabsTrigger>
                        <TabsTrigger value="support" className="rounded-2xl px-8 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] gap-2">
                            <LifeBuoy className="h-4 w-4" /> {t('adminSupportTab')}
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="rounded-2xl px-8 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] gap-2">
                            <SettingsIcon className="h-4 w-4" /> {t('adminSystemTab')}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="dashboard" className="space-y-6 outline-none">
                    <Card className="rounded-[3rem] border-border/50 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden p-8 px-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="text-left">
                                <h3 className="text-xl font-black tracking-tight">{t('adminPlatformGrowth')}</h3>
                                <p className="text-muted-foreground font-medium">{t('adminDashboardDesc')}</p>
                            </div>
                            <div className="flex gap-1 bg-secondary/10 p-1 rounded-2xl">
                                {(['7d', '30d', 'all'] as const).map((r) => (
                                    <Button
                                        key={r}
                                        variant={timeRange === r ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setTimeRange(r)}
                                        className="rounded-xl text-[10px] h-8 font-black uppercase tracking-widest px-4"
                                    >
                                        {t(`range${r}` as any)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.2)" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: 'hsl(var(--muted-foreground))' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        hide
                                    />
                                    <ChartTooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            borderRadius: '1rem',
                                            border: '1px solid hsl(var(--border)/0.5)',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="users"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorUsers)"
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="space-y-6 outline-none">
                    <Card className="rounded-[3rem] border-border/50 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden text-left">
                        <div className="p-8 border-b border-border/40">
                            <h3 className="text-xl font-black tracking-tight">{t('adminUsersTab')}</h3>
                            <p className="text-muted-foreground font-medium">{t('adminUsersDesc')}</p>
                        </div>
                        <div className="p-8 border-b border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('adminSearchUsers')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-12 h-12 rounded-2xl bg-secondary/20 border-border/20 focus:ring-primary/20"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={userFilter === 'all' ? "secondary" : "ghost"}
                                    onClick={() => setUserFilter('all')}
                                    className="rounded-2xl h-12 uppercase tracking-tighter text-xs font-black"
                                >
                                    {t('adminAllUsers')}
                                </Button>
                                <Button
                                    variant={userFilter === 'admins' ? "secondary" : "ghost"}
                                    onClick={() => setUserFilter('admins')}
                                    className="rounded-2xl h-12 uppercase tracking-tighter text-xs font-black"
                                >
                                    {t('adminOnlyAdmins')}
                                </Button>
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-border/10">
                                    <tr>
                                        <th className="px-8 py-4">{t('profile')}</th>
                                        <th className="px-8 py-4">{t('adminStatus')}</th>
                                        <th className="px-8 py-4">{t('adminRole')}</th>
                                        <th className="px-8 py-4">{t('time')}</th>
                                        <th className="px-8 py-4 text-right">{t('adminActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {filteredUsers.length > 0 ? filteredUsers.slice((userPage - 1) * ITEMS_PER_PAGE, userPage * ITEMS_PER_PAGE).map((u, i) => (
                                        <tr key={u.id || i} className="hover:bg-secondary/5 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-xs text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                                        {(u.name || u.full_name || u.email || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">
                                                            {u.display_name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{u.display_email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${(u.status || 'active').toLowerCase() === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {(u.status || 'active').toLowerCase() === 'active' ? t('adminActive') : t('adminBanned')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-medium text-muted-foreground">
                                                <select
                                                    className="bg-transparent border-none focus:ring-0 cursor-pointer hover:text-primary transition-colors outline-none"
                                                    value={u.role || 'Reader'}
                                                    onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                                >
                                                    <option value="Reader">{t('adminReader')}</option>
                                                    <option value="Premium">{t('adminPremium')}</option>
                                                    <option value="Admin">{t('adminAdmin')}</option>
                                                </select>
                                            </td>
                                            <td className="px-8 py-5 text-[10px] font-bold text-muted-foreground/60">
                                                {formatDate(u.created_at)}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {(u.status || 'active').toLowerCase() === 'active' ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="rounded-xl h-9 w-9 p-0 hover:bg-red-500/10 hover:text-red-500"
                                                            onClick={() => handleUpdateUserStatus(u.id, 'Banned')}
                                                        >
                                                            <CircleSlash className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="rounded-xl h-9 w-9 p-0 hover:bg-green-500/10 hover:text-green-500"
                                                            onClick={() => handleUpdateUserStatus(u.id, 'Active')}
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="rounded-xl h-9 w-9 p-0 hover:bg-red-500/10 hover:text-red-500"
                                                        onClick={() => handleDeleteUser(u.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-10 text-center text-muted-foreground italic">
                                                {t('adminNoUsers')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {filteredUsers.length > ITEMS_PER_PAGE && (
                            <div className="p-4 border-t border-border/10 flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={userPage === 1}
                                    onClick={() => setUserPage(p => p - 1)}
                                    className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
                                >
                                    <ChevronRight className="h-4 w-4 rotate-180" /> {t('previous')}
                                </Button>
                                <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">
                                    {t('pageOf', { current: userPage, total: Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) })}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={userPage * ITEMS_PER_PAGE >= filteredUsers.length}
                                    onClick={() => setUserPage(p => p + 1)}
                                    className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
                                >
                                    {t('next')} <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="content" className="space-y-6 outline-none">
                    <Card className="rounded-[3rem] border-border/50 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden text-sm text-left">
                        <div className="p-8 border-b border-border/40 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black tracking-tight">{t('adminGlobalLibrary')}</h3>
                                <p className="text-muted-foreground font-medium">{t('adminContentDesc')}</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                                <Input
                                    placeholder={t('bookSearch') + "..."}
                                    value={bookSearchQuery}
                                    onChange={(e) => { setBookSearchQuery(e.target.value); setBookPage(1); }}
                                    className="pl-11 h-10 w-64 rounded-2xl bg-secondary/10 border-border/20 text-xs focus:ring-primary/20"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-border/10">
                                    <tr>
                                        <th className="px-8 py-4">{t('adminBookTitle')}</th>
                                        <th className="px-8 py-4">{t('adminAuthor')}</th>
                                        <th className="px-8 py-4">{t('adminUploadedBy')}</th>
                                        <th className="px-8 py-4">{t('adminSize')}</th>
                                        <th className="px-8 py-4">{t('time')}</th>
                                        <th className="px-8 py-4 text-right">{t('adminActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {(() => {
                                        const filtered = allBooks.filter(b =>
                                            b.title?.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
                                            b.author?.toLowerCase().includes(bookSearchQuery.toLowerCase())
                                        );
                                        return filtered.length > 0 ? filtered.slice((bookPage - 1) * ITEMS_PER_PAGE, bookPage * ITEMS_PER_PAGE).map((b) => (
                                            <tr key={b.id} className="hover:bg-secondary/5 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-6 bg-primary/20 rounded flex items-center justify-center text-[10px] font-bold">
                                                            {b.format?.toUpperCase() || 'PDF'}
                                                        </div>
                                                        <span className="font-bold">{b.title}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-muted-foreground">{b.author || t('unknown')}</td>
                                                <td className="px-8 py-5 text-xs font-medium text-muted-foreground truncate max-w-[150px]">
                                                    {usersList.find(u => u.id === b.user_id)?.display_name || b.user_id}
                                                </td>
                                                <td className="px-8 py-5 text-xs text-muted-foreground">{(b.file_size / (1024 * 1024)).toFixed(1)} MB</td>
                                                <td className="px-8 py-5 text-[10px] font-bold text-muted-foreground/60">
                                                    {formatDate(b.created_at)}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={isActionLoading === `delete_book_${b.id}`}
                                                            className="rounded-xl h-9 w-9 p-0 hover:bg-red-500/10 hover:text-red-500"
                                                            onClick={() => handleDeleteBook(b.id)}
                                                        >
                                                            {isActionLoading === `delete_book_${b.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-10 text-center text-muted-foreground italic">
                                                    {bookSearchQuery ? t('noResultsFound') : t('adminNoBooks')}
                                                </td>
                                            </tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                        {(() => {
                            const filteredCount = allBooks.filter(b =>
                                b.title?.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
                                b.author?.toLowerCase().includes(bookSearchQuery.toLowerCase())
                            ).length;

                            return filteredCount > ITEMS_PER_PAGE && (
                                <div className="p-4 border-t border-border/10 flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={bookPage === 1}
                                        onClick={() => setBookPage(p => p - 1)}
                                        className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
                                    >
                                        <ChevronRight className="h-4 w-4 rotate-180" /> {t('previous')}
                                    </Button>
                                    <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">
                                        {t('pageOf', { current: bookPage, total: Math.ceil(filteredCount / ITEMS_PER_PAGE) })}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={bookPage * ITEMS_PER_PAGE >= filteredCount}
                                        onClick={() => setBookPage(p => p + 1)}
                                        className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
                                    >
                                        {t('next')} <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })()}
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-6 outline-none">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="rounded-[2.5rem] border-border/50 bg-card/40 backdrop-blur-sm p-8 text-left">
                            <CardTitle className="text-lg flex items-center gap-2 mb-6">
                                <SettingsIcon className="h-5 w-5 text-primary" /> {t('systemConfig')}
                            </CardTitle>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-3xl bg-secondary/10">
                                    <div className="space-y-1">
                                        <p className="font-bold text-sm">{t('maintenanceMode')}</p>
                                        <p className="text-xs text-muted-foreground">{t('maintenanceOnlyAdmin')}</p>
                                    </div>
                                    <Switch
                                        checked={systemSettings.maintenance_mode}
                                        onCheckedChange={(val) => handleUpdateSystemSetting('maintenance_mode', val)}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-3xl bg-secondary/10">
                                    <div className="space-y-1">
                                        <p className="font-bold text-sm">{t('newSignups')}</p>
                                        <p className="text-xs text-muted-foreground">{t('allowSignupsDesc')}</p>
                                    </div>
                                    <Switch
                                        checked={systemSettings.allow_signups}
                                        onCheckedChange={(val) => handleUpdateSystemSetting('allow_signups', val)}
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card className="rounded-[2.5rem] border-border/50 bg-card/40 backdrop-blur-sm p-8 flex flex-col items-center justify-center text-center gap-4">
                            <div className="h-16 w-16 rounded-[2rem] bg-primary/10 flex items-center justify-center">
                                <Database className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-left w-full">
                                <h4 className="font-black text-xl tracking-tight">{t('storageCleanup')}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('cleanupDesc')}
                                </p>
                            </div>

                            <div className="w-full space-y-3">
                                {orphanFiles.length > 0 ? (
                                    <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-left">
                                        <p className="text-sm font-bold text-orange-500">
                                            {t('orphansFound', { count: orphanFiles.length })}
                                        </p>
                                        <Button
                                            onClick={handleDeleteOrphans}
                                            variant="destructive"
                                            className="w-full mt-3 rounded-xl h-10 text-xs font-black uppercase tracking-widest"
                                        >
                                            {t('deleteOrphans')}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleScanStorage}
                                        disabled={isScanningStorage}
                                        className="w-full rounded-2xl h-12 gap-2 font-black uppercase tracking-widest text-[10px]"
                                    >
                                        {isScanningStorage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                        {t('scanStorage')}
                                    </Button>
                                )}
                            </div>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="activity" className="space-y-6 outline-none">
                    <Card className="rounded-[3rem] border-border/50 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden text-left">
                        <div className="p-8 border-b border-border/40">
                            <h3 className="text-xl font-black tracking-tight">{t('adminRecentActivity')}</h3>
                            <p className="text-muted-foreground font-medium">{t('adminActivityHistory')}</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-border/10">
                                    <tr>
                                        <th className="px-8 py-4">{t('time')}</th>
                                        <th className="px-8 py-4">{t('admin')}</th>
                                        <th className="px-8 py-4">{t('action')}</th>
                                        <th className="px-8 py-4">{t('target')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {adminLogs.length > 0 ? adminLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-secondary/5 transition-colors group">
                                            <td className="px-8 py-5 text-xs font-medium text-muted-foreground">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-8 py-5 text-sm font-bold">
                                                {log.admin_email}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.action.includes('BAN') || log.action.includes('DELETE')
                                                    ? 'bg-red-500/10 text-red-500'
                                                    : 'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-sm">
                                                <span className="font-bold">{log.target_name}</span>
                                                <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{log.target_id}</p>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-10 text-center text-muted-foreground italic">
                                                {t('adminNoLogs')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
                <TabsContent value="announcements" className="space-y-6 outline-none">
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="rounded-[2.5rem] border-border/50 bg-card/40 backdrop-blur-sm p-8 text-left md:col-span-1">
                            <h3 className="text-xl font-black tracking-tight mb-6">{t('adminNewAnnouncement')}</h3>
                            <div className="space-y-4">
                                <Input
                                    placeholder={t('title')}
                                    value={newAnnouncement.title}
                                    onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                                    className="rounded-xl h-12"
                                />
                                <textarea
                                    placeholder={t('message')}
                                    value={newAnnouncement.message}
                                    onChange={e => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                                    className="w-full h-32 rounded-xl bg-secondary/10 border-border/20 p-4 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                                />
                                <select
                                    className="w-full h-12 rounded-xl bg-secondary/10 border-border/20 px-4 text-sm outline-none"
                                    value={newAnnouncement.type}
                                    onChange={e => setNewAnnouncement(prev => ({ ...prev, type: e.target.value }))}
                                >
                                    <option value="info">{t('annTypeInfo')}</option>
                                    <option value="warning">{t('annTypeWarning')}</option>
                                    <option value="success">{t('annTypeSuccess')}</option>
                                    <option value="error">{t('annTypeError')}</option>
                                </select>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">{t('expiresAt')}</p>
                                    <Input
                                        type="date"
                                        value={newAnnouncement.expires_at}
                                        onChange={e => setNewAnnouncement(prev => ({ ...prev, expires_at: e.target.value }))}
                                        className="rounded-xl h-12"
                                    />
                                </div>
                                <Button
                                    onClick={handleCreateAnnouncement}
                                    disabled={isActionLoading === 'createAnnouncement'}
                                    className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2"
                                >
                                    {isActionLoading === 'createAnnouncement' && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {t('publishNow')}
                                </Button>
                            </div>
                        </Card>

                        <Card className="rounded-[2.5rem] border-border/50 bg-card/40 backdrop-blur-sm p-8 text-left md:col-span-2">
                            <h3 className="text-xl font-black tracking-tight mb-6">{t('adminActiveAnnouncements')}</h3>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {announcements.length > 0 ? announcements.map(ann => (
                                    <div key={ann.id} className="p-6 rounded-3xl bg-secondary/10 border border-border/20 flex items-start justify-between gap-4 group">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${ann.type === 'info' ? 'bg-blue-500' :
                                                    ann.type === 'warning' ? 'bg-orange-500' :
                                                        ann.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                                                    }`} />
                                                <h4 className="font-bold text-sm">{ann.title}</h4>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{ann.message}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <p className="text-[10px] text-muted-foreground/40">
                                                    {new Date(ann.created_at).toLocaleString()} • {ann.created_by}
                                                </p>
                                                {ann.expires_at && (
                                                    <p className="text-[10px] text-amber-500/60 font-medium">
                                                        • {t('expiresAt')}: {new Date(ann.expires_at).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteAnnouncement(ann.id)}
                                            className="rounded-xl h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )) : (
                                    <div className="text-center py-20 text-muted-foreground italic">
                                        {t('adminNoAnnouncements')}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="support" className="space-y-6 outline-none">
                    <Card className="rounded-[3rem] border-border/50 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden text-left">
                        <div className="p-8 border-b border-border/40 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black tracking-tight">{t('adminSupportTab')}</h3>
                                <p className="text-muted-foreground font-medium">{t('adminSupportDesc')}</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-4 py-2 rounded-2xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                                    {t('openTickets', { count: supportTickets.filter(t => t.status === 'open').length })}
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-border/10">
                                    <tr>
                                        <th className="px-8 py-4">{t('adminStatus')}</th>
                                        <th className="px-8 py-4">{t('category')}</th>
                                        <th className="px-8 py-4">{t('message')}</th>
                                        <th className="px-8 py-4">{t('profileAccount')}</th>
                                        <th className="px-8 py-4 px-8 text-right">{t('adminActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {supportTickets.length > 0 ? supportTickets.map((ticket) => (
                                        <tr key={ticket.id} className="hover:bg-secondary/5 transition-colors group">
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ticket.status === 'open' ? 'bg-green-500/10 text-green-500' :
                                                    ticket.status === 'resolved' ? 'bg-blue-500/10 text-blue-500' : 'bg-secondary text-muted-foreground'
                                                    }`}>
                                                    {t(`ticket_${ticket.status}` as any)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-xs font-bold uppercase tracking-tighter">{t(`cat_${ticket.category}` as any)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 max-w-md">
                                                <p className="text-sm font-bold truncate">{ticket.subject}</p>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.message}</p>

                                                {ticket.status === 'open' ? (
                                                    <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                                                        <textarea
                                                            placeholder={t('replyToTicket')}
                                                            value={ticketReplies[ticket.id] || ''}
                                                            onChange={e => setTicketReplies(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                                            className="w-full h-20 rounded-xl bg-secondary/10 border-border/20 p-3 text-xs focus:ring-1 focus:ring-primary outline-none resize-none"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSendTicketReply(ticket.id)}
                                                            disabled={!ticketReplies[ticket.id] || isActionLoading === `reply_${ticket.id}`}
                                                            className="rounded-xl h-8 px-4 text-[10px] font-black uppercase tracking-widest gap-2"
                                                        >
                                                            {isActionLoading === `reply_${ticket.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
                                                            {t('sendReply')}
                                                        </Button>
                                                    </div>
                                                ) : ticket.admin_reply && (
                                                    <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                                        <p className="text-[10px] font-bold text-primary uppercase mb-1">{t('admin')}:</p>
                                                        <p className="text-xs italic text-muted-foreground">{ticket.admin_reply}</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-sm font-medium">{ticket.user_email}</p>
                                                <p className="text-[10px] text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {ticket.status !== 'resolved' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleUpdateTicketStatus(ticket.id, 'resolved')}
                                                            className="rounded-xl h-8 text-[10px] font-black uppercase tracking-widest gap-2"
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5" /> {t('resolve')}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteTicket(ticket.id)}
                                                        className="rounded-xl h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground italic">
                                                {t('adminNoTickets')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
                <TabsContent value="insights" className="space-y-6 outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Popular Books */}
                        <Card className="rounded-[3rem] border-border/50 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden text-left">
                            <div className="p-8 border-b border-border/40">
                                <h3 className="text-xl font-black tracking-tight">{t('popularBooks')}</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                {insights.popularBooks.length > 0 ? insights.popularBooks.map((b, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10">
                                        <div className="space-y-1">
                                            <p className="font-bold">{b.title}</p>
                                            <p className="text-xs text-muted-foreground">{b.author}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-primary">{b.count}</p>
                                            <p className="text-[10px] font-bold uppercase opacity-60">{t('readerCount')}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-20 text-center text-muted-foreground italic">
                                        {t('noDataAvailable')}
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Top Read Books */}
                        <Card className="rounded-[3rem] border-border/50 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden text-left">
                            <div className="p-8 border-b border-border/40">
                                <h3 className="text-xl font-black tracking-tight">{t('topReadBooks')}</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                {insights.topReadBooks.length > 0 ? insights.topReadBooks.map((b, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10">
                                        <div className="space-y-1">
                                            <p className="font-bold">{b.title}</p>
                                            <p className="text-xs text-muted-foreground">{b.author}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-primary">{Math.floor(b.totalTime / 60)}</p>
                                            <p className="text-[10px] font-bold uppercase opacity-60">{t('minutes')}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-20 text-center text-muted-foreground italic">
                                        {t('noDataAvailable')}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div >
    );
};

export default AdminPage;
