import { Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Boxes,
    ChefHat,
    Clock,
    Coffee,
    FolderTree,
    LayoutDashboard,
    LogOut,
    ScrollText,
    Settings,
    ShoppingBag,
    SlidersHorizontal,
    Store,
    Truck,
    Users,
    UtensilsCrossed,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { formatRupiah, formatTimeWib } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ActiveShift, Auth, UserRole } from '@/types/auth';

type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    roles: UserRole[];
};

type PageProps = {
    auth: Auth;
    activeShift: ActiveShift;
    flash?: {
        success?: string | null;
        error?: string | null;
    };
};

const NAV_ITEMS: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
        roles: ['admin'],
    },
    {
        label: 'Kategori',
        href: '/admin/categories',
        icon: FolderTree,
        roles: ['admin'],
    },
    {
        label: 'Menu & BOM',
        href: '/admin/menus',
        icon: UtensilsCrossed,
        roles: ['admin'],
    },
    {
        label: 'Modifier',
        href: '/admin/modifiers',
        icon: SlidersHorizontal,
        roles: ['admin'],
    },
    {
        label: 'Inventaris',
        href: '/admin/inventory',
        icon: Boxes,
        roles: ['admin'],
    },
    {
        label: 'Distributor',
        href: '/admin/distributors',
        icon: Truck,
        roles: ['admin'],
    },
    {
        label: 'Laporan',
        href: '/admin/reports',
        icon: BarChart3,
        roles: ['admin'],
    },
    {
        label: 'Karyawan',
        href: '/admin/staff',
        icon: Users,
        roles: ['admin'],
    },
    {
        label: 'Audit Log',
        href: '/admin/audit-logs',
        icon: ScrollText,
        roles: ['admin'],
    },
    {
        label: 'Kiosk & Kafe',
        href: '/admin/settings',
        icon: Store,
        roles: ['admin'],
    },
    {
        label: 'POS Kasir',
        href: '/pos',
        icon: ShoppingBag,
        roles: ['admin', 'kasir'],
    },
    {
        label: 'Shift Kasir',
        href: '/pos/shift',
        icon: Clock,
        roles: ['admin', 'kasir'],
    },
    {
        label: 'Kitchen (KDS)',
        href: '/kds',
        icon: ChefHat,
        roles: ['admin', 'barista'],
    },
    {
        label: 'Pengaturan',
        href: '/settings/profile',
        icon: Settings,
        roles: ['admin', 'kasir', 'barista'],
    },
];

export default function OurCoffeeRailLayout({
    children,
}: {
    children: ReactNode;
}) {
    const page = usePage<PageProps>();
    const user = page.props.auth?.user;
    const activeShift = page.props.activeShift;
    const flash = page.props.flash;
    const currentUrl = page.url.split('?')[0] ?? page.url;

    const visibleNav = user
        ? NAV_ITEMS.filter((item) => item.roles.includes(user.role))
        : [];

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <div className="flex min-h-screen w-full bg-background text-foreground">
            <aside className="flex w-20 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:w-60">
                <div className="flex flex-col gap-5 p-3 lg:p-4">
                    <div className="flex items-center gap-3 px-1 py-1">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                            <Coffee className="size-6" />
                        </div>
                        <div className="hidden min-w-0 lg:block">
                            <p className="truncate text-base font-bold tracking-tight">
                                Our Coffee
                            </p>
                            <p className="truncate text-xs text-latte/75">
                                Cafe Operations
                            </p>
                        </div>
                    </div>

                    <nav
                        aria-label="Navigasi Utama"
                        className="flex flex-col gap-1"
                    >
                        {visibleNav.map((item) => {
                            const Icon = item.icon;
                            const isActive =
                                currentUrl === item.href ||
                                currentUrl.startsWith(`${item.href}/`);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex min-h-11 items-center justify-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors lg:justify-start',
                                        isActive
                                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                    )}
                                >
                                    <Icon className="size-5 shrink-0" />
                                    <span className="hidden truncate lg:inline">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex flex-col gap-3 border-t border-sidebar-border p-3 lg:p-4">
                    {activeShift && (
                        <div className="hidden rounded-xl bg-sidebar-accent px-3 py-2.5 text-xs lg:block">
                            <p className="font-semibold text-latte">
                                Shift Aktif #{activeShift.id}
                            </p>
                            <p className="font-money mt-0.5 text-sidebar-foreground/80">
                                Modal: {formatRupiah(activeShift.opening_cash)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-sidebar-foreground/60">
                                Buka {formatTimeWib(activeShift.opened_at)} WIB
                            </p>
                        </div>
                    )}

                    {user && (
                        <div className="hidden px-1 lg:block">
                            <p className="truncate text-sm font-semibold">
                                {user.name}
                            </p>
                            <p className="truncate text-xs text-latte/75 uppercase">
                                {user.role}
                            </p>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-sidebar-border px-3 py-2 text-sm font-medium text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent lg:justify-start"
                    >
                        <LogOut className="size-5 shrink-0" />
                        <span className="hidden lg:inline">Keluar</span>
                    </button>
                </div>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
                {(flash?.error || flash?.success) && (
                    <div className="px-6 pt-4">
                        {flash.error && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                                {flash.error}
                            </div>
                        )}
                        {flash.success && (
                            <div className="rounded-xl border border-emerald-700/30 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                                {flash.success}
                            </div>
                        )}
                    </div>
                )}
                <div className="flex-1 p-6">{children}</div>
            </main>
        </div>
    );
}
