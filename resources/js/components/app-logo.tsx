import { usePage } from '@inertiajs/react';
import { Coffee } from 'lucide-react';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-xs">
                <Coffee className="size-5" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-bold text-foreground">
                    {name || 'Our Coffee'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    Cafe Operations
                </span>
            </div>
        </>
    );
}
