
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useBookStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/translations';

export default function LoginPage() {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const { user, loading } = useAuthStore();
    const signIn = useAuthStore(state => state.signIn);
    const signUp = useAuthStore(state => state.signUp);
    const { settings } = useBookStore();
    const t = useTranslation(settings.language);
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (user && !loading) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            if (isRegister) {
                const { error } = await signUp(email, password, username);
                if (error) {
                    toast.error(error.message || t('registrationFailed'));
                } else {
                    toast.success(t('registrationSuccess'));
                    setIsRegister(false);
                }
            } else {
                const { error } = await signIn(email, password);
                if (error) {
                    toast.error(error.message || t('loginFailed'));
                } else {
                    toast.success(t('loginSuccess'), { duration: 2000 });
                    navigate('/'); // Successful login transition
                }
            }
        } catch (error) {
            toast.error(t('errorOccurred'));
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4 font-sans">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="space-y-2 pt-10 px-8 text-center">
                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-black text-primary">E</span>
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tighter uppercase">{isRegister ? t('signUp') : t('welcomeBack')}</CardTitle>
                    <CardDescription className="font-medium opacity-60">
                        {isRegister ? t('register') : t('loginContinue')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isRegister && (
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest pl-1">{t('username')}</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder={t('username')}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="h-12 rounded-2xl border-border/20 bg-background/50 focus:ring-primary/20 transition-all"
                                    required={isRegister}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest pl-1">{t('email')}</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder={t('emailPlaceholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-12 rounded-2xl border-border/20 bg-background/50 focus:ring-primary/20 transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest pl-1">{t('password')}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 rounded-2xl border-border/20 bg-background/50 focus:ring-primary/20 transition-all"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all" disabled={loading}>
                            {loading ? t('loading') : (isRegister ? t('register') : t('login'))}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 px-8 pb-10">
                    <Button
                        variant="ghost"
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                        {isRegister ? t('alreadyHaveAccount') : t('noAccount')}
                    </Button>

                </CardFooter>
            </Card>
        </div>
    );
}
