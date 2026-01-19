
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore, useBookStore } from '@/stores/useStore';
import {
    User,
    Palette,
    BookOpen,
    Database,
    Bell,
    HelpCircle,
    Monitor,
    Sun,
    Moon,
    Type,
    Trash2,
    Shield,
    Info,
    Lock,
    Save,
    Loader2,
    MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { MockAPI } from '@/lib/mock-api';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/translations';

type TabType = 'profile' | 'appearance' | 'reading' | 'storage' | 'notifications' | 'support';

const SettingsPage = () => {
    const { user, updateProfile } = useAuthStore();
    const { settings, setSettings } = useBookStore();
    const t = useTranslation(settings.language);
    const [activeTab, setActiveTab] = useState<TabType>('profile');

    // Form States
    const [isUpdating, setIsUpdating] = useState(false);
    const [name, setName] = useState(user?.user_metadata?.name || '');
    const [email, setEmail] = useState(user?.email || '');

    // Password States
    const [isChangingPass, setIsChangingPass] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Support Ticket States
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketMessage, setTicketMessage] = useState('');
    const [ticketCategory, setTicketCategory] = useState('general');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    const handleSubmitTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketSubject || !ticketMessage) {
            toast.error(t('errorOccurred'));
            return;
        }

        setIsSubmittingTicket(true);
        try {
            const { error } = await supabase
                .from('support_tickets')
                .insert({
                    user_id: user?.id,
                    user_email: user?.email,
                    subject: ticketSubject,
                    message: ticketMessage,
                    category: ticketCategory,
                    status: 'open'
                });

            if (error) throw error;

            toast.success("Success! Message received.");
            setTicketSubject('');
            setTicketMessage('');
            setTicketCategory('general');
        } catch (error) {
            console.error(error);
            toast.error(t('errorOccurred'));
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            await updateProfile({ name, email });
            toast.success(t('profileUpdated'));
        } catch (error) {
            toast.error(t('errorOccurred'));
        } finally {
            setIsUpdating(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oldPassword || !newPassword) {
            toast.error(t('errorOccurred'));
            return;
        }
        if (newPassword.length < 6) {
            toast.error(t('passwordTooShort') || 'Şifre en az 6 karakter olmalı');
            return;
        }
        setIsChangingPass(true);
        try {
            // Use Supabase directly for password change
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            toast.success(t('passwordChanged'));
            setOldPassword('');
            setNewPassword('');
        } catch (error: any) {
            console.error("Password change error:", error);
            toast.error(error?.message || t('errorOccurred'));
        } finally {
            setIsChangingPass(false);
        }
    };

    const tabs: { id: TabType; label: string; icon: any }[] = [
        { id: 'profile', label: t('profileAccount'), icon: User },
        { id: 'appearance', label: t('appearance'), icon: Palette },
        { id: 'reading', label: t('readingPreferences'), icon: BookOpen },
        { id: 'storage', label: t('storageData'), icon: Database },
        { id: 'notifications', label: t('notifications'), icon: Bell },
        { id: 'support', label: t('support'), icon: HelpCircle },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Profile Info Card */}
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent pb-8">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
                                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                                        <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                                            {(user?.user_metadata?.name || user?.email || 'U')[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl">{user?.user_metadata?.name || user?.email?.split('@')[0] || t('profile')}</CardTitle>
                                        <CardDescription className="text-muted-foreground">{user?.email || t('email')}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">{t('name')}</Label>
                                            <Input
                                                id="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="bg-background/50 border-border/50 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">{t('email')}</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="bg-background/50 border-border/50 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="rounded-full px-8 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 gap-2"
                                    >
                                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {t('saveChanges')}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Password Change Card */}
                        <Card className="border-border/50 bg-card/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-primary" />
                                    {t('security')}
                                </CardTitle>
                                <CardDescription>{t('passwordUpdateDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="old-pass">{t('currentPassword')}</Label>
                                            <Input
                                                id="old-pass"
                                                type="password"
                                                placeholder="••••••••"
                                                value={oldPassword}
                                                onChange={(e) => setOldPassword(e.target.value)}
                                                className="bg-background/50 border-border/50 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new-pass">{t('newPassword')}</Label>
                                            <Input
                                                id="new-pass"
                                                type="password"
                                                placeholder="••••••••"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="bg-background/50 border-border/50 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        disabled={isChangingPass}
                                        className="rounded-full px-8 gap-2"
                                    >
                                        {isChangingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : t('updatePassword')}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-border/50 bg-card/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Palette className="h-5 w-5 text-primary" />
                                    {t('themeDiscovery')}
                                </CardTitle>
                                <CardDescription>{t('themeDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    {[
                                        { id: 'light', label: t('lightMode'), icon: Sun, color: 'bg-white border-slate-200 text-slate-900', desc: t('lightDesc') },
                                        { id: 'dark', label: t('darkMode'), icon: Moon, color: 'bg-[#09090b] border-zinc-800 text-white', desc: t('darkDesc') },
                                        { id: 'sepia', label: t('sepiaMode'), icon: Monitor, color: 'bg-[#f4ecd8] border-[#e8dfc4] text-[#433422]', desc: t('sepiaDesc') },
                                    ].map((themeItem) => (
                                        <button
                                            key={themeItem.id}
                                            onClick={() => setSettings({ theme: themeItem.id as any })}
                                            className={`flex flex-col items-start gap-4 p-5 rounded-[2.5rem] border-2 transition-all duration-300 relative overflow-hidden group ${settings.theme === themeItem.id
                                                ? 'border-primary bg-primary/5 scale-[1.02] shadow-2xl shadow-primary/10'
                                                : 'border-border/50 hover:border-border hover:bg-secondary/50'}`}
                                        >
                                            <div className={`h-24 w-full rounded-3xl border shadow-inner flex items-center justify-center transition-transform duration-500 group-hover:scale-105 ${themeItem.color}`}>
                                                <themeItem.icon className={`h-10 w-10 ${settings.theme === themeItem.id ? 'animate-pulse' : ''}`} />
                                            </div>
                                            <div className="flex flex-col items-start px-2">
                                                <span className="text-sm font-black uppercase tracking-widest">{themeItem.label}</span>
                                                <span className="text-[10px] font-bold text-muted-foreground opacity-70">{themeItem.desc}</span>
                                            </div>
                                            {settings.theme === themeItem.id && (
                                                <motion.div
                                                    layoutId="theme-active"
                                                    className="absolute top-4 right-4 h-3 w-3 rounded-full bg-primary shadow-[0_0_15px_rgba(255,100,0,0.5)]"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'reading':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-border/50 bg-card/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Type className="h-5 w-5 text-primary" />
                                    {t('readingExperience')}
                                </CardTitle>
                                <CardDescription>{t('readingExpDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="font-bold">{t('fontSize')} (%{settings.fontSize})</Label>
                                    <Slider
                                        value={[settings.fontSize]}
                                        onValueChange={([val]) => setSettings({ fontSize: val })}
                                        min={80}
                                        max={200}
                                        step={5}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label className="font-bold">{t('fontFamily')}</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Inter', 'Roboto', 'Merriweather', 'Georgia'].map(font => (
                                            <button
                                                key={font}
                                                onClick={() => setSettings({ fontFamily: font })}
                                                className={`p-3 rounded-2xl border transition-all text-sm font-semibold ${settings.fontFamily === font ? 'border-primary bg-primary/5 text-primary' : 'border-border/50 hover:bg-secondary'}`}
                                                style={{ fontFamily: font }}
                                            >
                                                {font}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'storage':
                // Calculate actual local storage usage
                const getStorageSize = () => {
                    let total = 0;
                    for (let x in localStorage) {
                        if (localStorage.hasOwnProperty(x)) {
                            total += (localStorage[x].length + x.length) * 2;
                        }
                    }
                    return (total / (1024 * 1024)).toFixed(2);
                };
                const usedMB = parseFloat(getStorageSize());
                const quotaMB = 50;

                return (
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Database className="h-5 w-5 text-primary" />
                                {t('storageData')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-6 rounded-[2rem] bg-secondary/20 border border-border/50">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('localStorageUsage')}</span>
                                    <span className="text-sm font-black text-primary">{usedMB} MB / {quotaMB} MB</span>
                                </div>
                                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden p-1 shadow-inner">
                                    <div className="h-full bg-primary rounded-full shadow-lg shadow-primary/20" style={{ width: `${(usedMB / quotaMB) * 100}%` }} />
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-2xl gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 transition-colors"
                                onClick={() => {
                                    if (window.confirm(t('confirmClearCache'))) {
                                        localStorage.removeItem('mock_books');
                                        localStorage.removeItem('reader_stats');
                                        localStorage.removeItem('reader_settings');
                                        window.location.reload();
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('clearCache')}
                            </Button>
                        </CardContent>
                    </Card>
                );
            case 'notifications':
                return (
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                {t('notifications')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {[
                                { title: t('reminders'), desc: t('remindersDesc') },
                                { title: t('newBookAnnouncements'), desc: t('newBookAnnouncementsDesc') },
                                { title: t('emailNotifications'), desc: t('emailNotificationsDesc') },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-secondary/20 transition-colors">
                                    <div className="space-y-1">
                                        <Label className="text-base font-bold">{item.title}</Label>
                                        <CardDescription>{item.desc}</CardDescription>
                                    </div>
                                    <Switch
                                        defaultChecked={idx === 0}
                                        onCheckedChange={(checked) => {
                                            toast.info(`${item.title}: ${checked ? 'Açıldı' : 'Kapatıldı'}`);
                                        }}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                );
            case 'support':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="border-border/50 bg-card/50 hover:bg-secondary/30 transition-all cursor-pointer group rounded-3xl overflow-hidden border-2 border-transparent hover:border-primary/20">
                                <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:rotate-12 transition-all">
                                        <Shield className="h-8 w-8 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm uppercase tracking-widest group-hover:text-primary transition-colors">{t('privacySecurity')}</p>
                                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t('privacyDesc')}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-border/50 bg-card/50 hover:bg-secondary/30 transition-all cursor-pointer group rounded-3xl overflow-hidden border-2 border-transparent hover:border-primary/20">
                                <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:-rotate-12 transition-all">
                                        <Info className="h-8 w-8 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm uppercase tracking-widest group-hover:text-primary transition-colors">{t('about')}</p>
                                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t('version')} 1.2.0 (Stable)</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <Card className="border-border/50 bg-card/50 overflow-hidden rounded-[2.5rem]">
                            <CardHeader className="bg-primary/5">
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-primary" />
                                    {t('sendUsMessage')}
                                </CardTitle>
                                <CardDescription>{t('supportMessageDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleSubmitTicket} className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2 text-left">
                                            <Label>{t('category')}</Label>
                                            <select
                                                className="w-full h-10 px-3 rounded-xl bg-background/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                value={ticketCategory}
                                                onChange={(e) => setTicketCategory(e.target.value)}
                                            >
                                                <option value="general">{t('generalInquiry')}</option>
                                                <option value="bug">{t('bugReport')}</option>
                                                <option value="content_report">{t('contentComplaint')}</option>
                                                <option value="feature">{t('featureRequest')}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            <Label>{t('subject')}</Label>
                                            <Input
                                                placeholder={t('subject')}
                                                value={ticketSubject}
                                                onChange={(e) => setTicketSubject(e.target.value)}
                                                className="bg-background/50 border-border/50 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <Label>{t('message')}</Label>
                                        <textarea
                                            placeholder={t('message')}
                                            className="w-full min-h-[150px] p-4 rounded-2xl bg-background/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            value={ticketMessage}
                                            onChange={(e) => setTicketMessage(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={isSubmittingTicket}
                                        className="w-full rounded-2xl h-12 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 gap-2 font-bold"
                                    >
                                        {isSubmittingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {t('submitTicket')}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-10 pb-20">
            <div className="space-y-2">
                <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-foreground via-foreground to-foreground/30 bg-clip-text text-transparent">{t('settings')}</h1>
                <p className="text-muted-foreground font-bold text-xl opacity-60">{t('settingsDesc')}</p>
            </div>

            <div className="grid gap-12 md:grid-cols-[300px_1fr]">
                {/* Sidebar Navigation */}
                <div className="space-y-3">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] transition-all duration-500 group relative border-2 ${activeTab === tab.id
                                ? 'bg-primary text-primary-foreground border-primary shadow-2xl shadow-primary/40 active:scale-95 z-10'
                                : 'text-muted-foreground border-transparent hover:bg-secondary hover:translate-x-2'}`}
                        >
                            <div className={`transition-all duration-500 ${activeTab === tab.id ? 'scale-125' : 'group-hover:scale-110 opacity-60'}`}>
                                <tab.icon className="h-5 w-5 stroke-[2]" />
                            </div>
                            <span className="font-black text-[12px] uppercase tracking-[0.25em]">{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="settings-active"
                                    className="absolute inset-0 bg-primary -z-10 rounded-[2.5rem]"
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="max-w-4xl relative">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
