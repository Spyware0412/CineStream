
"use client";

import { useEffect, useState } from 'react';
import { checkTmdbApiStatus } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function TmdbApiChecker() {
    const [status, setStatus] = useState<{
        loading: boolean;
        success: boolean | null;
        message: string;
    }>({
        loading: true,
        success: null,
        message: 'Checking TMDB API connection...'
    });

    useEffect(() => {
        const checkApi = async () => {
            const result = await checkTmdbApiStatus();
            setStatus({
                loading: false,
                success: result.success,
                message: result.message
            });
        };
        checkApi();
    }, []);

    const getBadgeVariant = () => {
        if (status.loading) return "secondary";
        return status.success ? "default" : "destructive";
    }
    
    const getIcon = () => {
        if (status.loading) return <Loader2 className="h-4 w-4 animate-spin" />;
        return status.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
    }

    return (
        <div className="mb-6">
            <Badge variant={getBadgeVariant()} className="p-2 pl-3 pr-4 rounded-md">
                <div className="flex items-center gap-2">
                    {getIcon()}
                    <div className="flex flex-col">
                        <span className="font-semibold text-xs">TMDB API Status</span>
                        <span className="text-xs">{status.message}</span>
                    </div>
                </div>
            </Badge>
        </div>
    );
}
