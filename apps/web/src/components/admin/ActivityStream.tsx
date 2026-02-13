
import React from 'react';
import {
    History,
    UserPlus,
    BookUp,
    Trash2,
    ShieldAlert,
    MessageSquare,
    Settings,
    Activity,
    LogOut,
    UserCheck,
    UserX
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityLog {
    id: string;
    created_at: string;
    admin_email: string;
    action: string;
    target_id: string;
    target_name: string;
    details: any;
}

interface ActivityStreamProps {
    logs: ActivityLog[];
    t: (key: any) => string;
}

const ActivityStream: React.FC<ActivityStreamProps> = ({ logs, t }) => {
    const getActionIcon = (action: string) => {
        switch (action) {
            case 'LOGIN': return { icon: UserCheck, color: 'text-green-500', bg: 'bg-green-500/10' };
            case 'LOGOUT': return { icon: LogOut, color: 'text-gray-500', bg: 'bg-gray-500/10' };
            case 'CREATE_ANNOUNCEMENT': return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' };
            case 'DELETE_ANNOUNCEMENT': return { icon: Trash2, color: 'text-red-500', bg: 'bg-red-500/10' };
            case 'UPLOAD_BOOK': return { icon: BookUp, color: 'text-orange-500', bg: 'bg-orange-500/10' };
            case 'DELETE_BOOK': return { icon: Trash2, color: 'text-red-500', bg: 'bg-red-500/10' };
            case 'BAN_USER': return { icon: UserX, color: 'text-red-600', bg: 'bg-red-600/10' };
            case 'UNBAN_USER': return { icon: UserPlus, color: 'text-green-500', bg: 'bg-green-500/10' };
            case 'CHANGE_ROLE': return { icon: ShieldAlert, color: 'text-purple-500', bg: 'bg-purple-500/10' };
            case 'UPDATE_SETTING': return { icon: Settings, color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
            case 'STORAGE_CLEANUP': return { icon: Activity, color: 'text-cyan-500', bg: 'bg-cyan-500/10' };
            default: return { icon: History, color: 'text-muted-foreground', bg: 'bg-muted/10' };
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    };

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 opacity-50">
                <Activity className="h-12 w-12 text-muted-foreground" />
                <p className="font-medium">{t('adminNoLogs')}</p>
            </div>
        );
    }

    return (
        <div className="relative space-y-4">
            {/* Timeline Line */}
            <div className="absolute left-[20px] top-4 bottom-4 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

            {logs.map((log, idx) => {
                const { icon: ActionIcon, color, bg } = getActionIcon(log.action);
                return (
                    <motion.div
                        key={log.id || idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="relative pl-12 group"
                    >
                        {/* Dot / Icon */}
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full ${bg} flex items-center justify-center border border-white/10 shadow-sm z-10 group-hover:scale-110 transition-transform`}>
                            <ActionIcon className={`h-5 w-5 ${color}`} />
                        </div>

                        <div className="bg-card/30 backdrop-blur-xl border border-border/40 p-4 rounded-2xl flex items-center justify-between gap-4 group-hover:bg-card/50 transition-all">
                            <div className="space-y-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">{log.action}</span>
                                    <span className="h-1 w-1 rounded-full bg-border" />
                                    <span className="text-[10px] font-bold text-muted-foreground">{formatTime(log.created_at)}</span>
                                </div>
                                <p className="text-sm font-bold tracking-tight">
                                    {log.target_name}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                    <span className="opacity-60">{t('admin')}:</span>
                                    <span className="text-foreground/70">{log.admin_email}</span>
                                </p>
                            </div>

                            <div className="text-right flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">{formatDate(log.created_at)}</span>
                                {log.details && Object.keys(log.details).length > 0 && (
                                    <div className="px-2 py-0.5 rounded-lg bg-secondary/20 border border-border/10">
                                        <p className="text-[8px] font-mono text-muted-foreground truncate max-w-[120px]">
                                            {JSON.stringify(log.details)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default ActivityStream;
