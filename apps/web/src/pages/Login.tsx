
import React, { useState } from 'react';
import { useAuthStore, useBookStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/translations';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const signIn = useAuthStore(state => state.signIn);
    const loading = useAuthStore(state => state.loading);
    const { settings } = useBookStore();
    const t = useTranslation(settings.language);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            // Mock login
            await signIn();
            toast.success(t('loginSuccess'), { duration: 2000 });
        } catch (error) {
            toast.error(t('loginFailed'));
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
            <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight text-center">{t('welcomeBack')}</CardTitle>
                    <CardDescription className="text-center">
                        {t('loginContinue')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('email')}</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder={t('emailPlaceholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('password')}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? t('loggingIn') : t('login')}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <div className="text-sm text-center text-muted-foreground">
                        {t('demoLoginInfo')}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
