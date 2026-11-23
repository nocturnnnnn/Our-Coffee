import { Link } from '@inertiajs/react';
import { Coffee } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="flex w-full max-w-md flex-col gap-6">
                <Link
                    href={home()}
                    className="flex flex-col items-center gap-3 self-center font-medium transition-transform hover:scale-105"
                >
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-md ring-4 ring-sidebar-primary/20">
                        <Coffee className="size-8" />
                    </div>
                    <div className="text-center">
                        <span className="text-lg font-bold tracking-tight text-foreground">
                            Our Coffee
                        </span>
                        <p className="text-xs text-muted-foreground">
                            Cafe Operations Platform
                        </p>
                    </div>
                </Link>

                <div className="flex flex-col gap-6">
                    <Card className="rounded-2xl border-border/80 shadow-md">
                        <CardHeader className="px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                                {title}
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                {description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
