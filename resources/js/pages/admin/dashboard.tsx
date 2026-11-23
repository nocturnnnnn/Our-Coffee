import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Receipt,
    ShoppingBag,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePolling } from '@/hooks/use-polling';
import { formatRupiah } from '@/lib/format';
import { jsonRequest } from '@/lib/http';
import { cn } from '@/lib/utils';

type DashboardProps = {
    days: number;
    kpis: {
        today_revenue: number;
        today_orders: number;
        today_aov: number;
        low_stock_count: number;
    };
    revenueTrend: Array<{
        date: string;
        label: string;
        revenue: number;
        orders: number;
    }>;
    channelSplit: {
        kiosk_orders: number;
        kiosk_revenue: number;
        pos_orders: number;
        pos_revenue: number;
    };
    peakHours: Array<{
        hour: number;
        label: string;
        orders: number;
    }>;
    topMenus: Array<{
        menu_item_id: number;
        name: string;
        qty_sold: number;
        revenue: number;
        cogs: number;
        gross_profit: number;
        margin_percent: number;
    }>;
    lowStockIngredients: Array<{
        id: number;
        name: string;
        unit: string;
        current_stock: number;
        min_stock: number;
    }>;
};

export default function AdminDashboard(initialProps: DashboardProps) {
    const [data, setData] = useState<DashboardProps>(initialProps);

    const refreshMetrics = useCallback(async () => {
        try {
            const res = await jsonRequest<DashboardProps>(
                `/admin/dashboard/metrics?days=${data.days}`,
            );
            if (res.ok) {
                setData(res.data);
            }
        } catch {
            // Silent retry on next 30s poll
        }
    }, [data.days]);

    usePolling(refreshMetrics, 30000, true);

    const switchDays = (days: 7 | 30) => {
        router.get(
            '/admin/dashboard',
            { days },
            {
                preserveState: false,
            },
        );
    };

    const maxRevenue = Math.max(1, ...data.revenueTrend.map((d) => d.revenue));
    const maxPeak = Math.max(1, ...data.peakHours.map((h) => h.orders));

    const totalChannelOrders =
        data.channelSplit.kiosk_orders + data.channelSplit.pos_orders;
    const kioskPercent =
        totalChannelOrders > 0
            ? Math.round(
                  (data.channelSplit.kiosk_orders / totalChannelOrders) * 100,
              )
            : 0;
    const posPercent = totalChannelOrders > 0 ? 100 - kioskPercent : 0;
    const donutRadius = 42;
    const donutCircumference = 2 * Math.PI * donutRadius;
    const kioskDash = (kioskPercent / 100) * donutCircumference;

    return (
        <>
            <Head title="Dashboard Admin" />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Dashboard Operasional
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Ringkasan KPI real-time (auto-refresh setiap 30
                            detik).
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={data.days === 7 ? 'default' : 'outline'}
                            onClick={() => switchDays(7)}
                        >
                            7 Hari
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={data.days === 30 ? 'default' : 'outline'}
                            onClick={() => switchDays(30)}
                        >
                            30 Hari
                        </Button>
                    </div>
                </div>

                {/* 4 KPI Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                            <span>Omzet Hari Ini</span>
                            <Wallet className="size-4 text-primary" />
                        </div>
                        <p className="font-money mt-2 text-2xl font-extrabold text-primary">
                            {formatRupiah(data.kpis.today_revenue)}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                            <span>Total Transaksi</span>
                            <Receipt className="size-4 text-primary" />
                        </div>
                        <p className="font-money mt-2 text-2xl font-extrabold">
                            {data.kpis.today_orders}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                            <span>Average Order Value</span>
                            <TrendingUp className="size-4 text-emerald-700" />
                        </div>
                        <p className="font-money mt-2 text-2xl font-extrabold">
                            {formatRupiah(data.kpis.today_aov)}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                            <span>Bahan Stok Menipis</span>
                            <AlertTriangle
                                className={cn(
                                    'size-4',
                                    data.kpis.low_stock_count > 0
                                        ? 'text-red-700'
                                        : 'text-emerald-700',
                                )}
                            />
                        </div>
                        <p
                            className={cn(
                                'font-money mt-2 text-2xl font-extrabold',
                                data.kpis.low_stock_count > 0 && 'text-red-700',
                            )}
                        >
                            {data.kpis.low_stock_count}
                        </p>
                    </div>
                </div>

                {/* Revenue Trend + Channel Donut */}
                <div className="grid gap-5 lg:grid-cols-3">
                    <div className="rounded-2xl border bg-card p-5 shadow-xs lg:col-span-2">
                        <h2 className="text-base font-bold">
                            Tren Omzet ({data.days} Hari Terakhir)
                        </h2>
                        <div className="mt-4 flex h-52 items-end gap-1.5 overflow-x-auto pt-4">
                            {data.revenueTrend.map((point) => {
                                const heightPct = Math.max(
                                    4,
                                    Math.round(
                                        (point.revenue / maxRevenue) * 100,
                                    ),
                                );
                                return (
                                    <div
                                        key={point.date}
                                        className="flex min-w-5 flex-1 flex-col items-center gap-1.5"
                                        title={`${point.date}: ${formatRupiah(point.revenue)} (${point.orders} order)`}
                                    >
                                        <div className="flex h-40 w-full items-end">
                                            <div
                                                className="w-full rounded-t-md bg-crema/85 transition-all hover:bg-crema"
                                                style={{
                                                    height: `${heightPct}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="font-money text-[10px] text-muted-foreground">
                                            {point.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs">
                        <h2 className="text-base font-bold">
                            Kontribusi Channel
                        </h2>
                        <div className="my-4 flex items-center justify-center">
                            <svg
                                viewBox="0 0 120 120"
                                className="size-40 -rotate-90"
                                role="img"
                                aria-label="Donut Chart Kiosk vs POS"
                            >
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={donutRadius}
                                    fill="transparent"
                                    stroke="#1c120d"
                                    strokeWidth="16"
                                />
                                {totalChannelOrders > 0 && (
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r={donutRadius}
                                        fill="transparent"
                                        stroke="#b45309"
                                        strokeWidth="16"
                                        strokeDasharray={`${kioskDash} ${donutCircumference}`}
                                    />
                                )}
                            </svg>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 font-semibold">
                                    <span className="size-3 rounded-full bg-crema" />
                                    Self-Ordering Kiosk ({kioskPercent}%)
                                </span>
                                <span className="font-money font-bold">
                                    {formatRupiah(
                                        data.channelSplit.kiosk_revenue,
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 font-semibold">
                                    <span className="size-3 rounded-full bg-espresso" />
                                    POS Kasir ({posPercent}%)
                                </span>
                                <span className="font-money font-bold">
                                    {formatRupiah(
                                        data.channelSplit.pos_revenue,
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Peak Hours Heatmap */}
                <div className="rounded-2xl border bg-card p-5 shadow-xs">
                    <h2 className="text-base font-bold">
                        Heatmap Jam Sibuk (Peak Hours)
                    </h2>
                    <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-12">
                        {data.peakHours.map((bucket) => {
                            const ratio = bucket.orders / maxPeak;
                            const bgClass =
                                bucket.orders === 0
                                    ? 'bg-muted text-muted-foreground'
                                    : ratio >= 0.75
                                      ? 'bg-crema text-white'
                                      : ratio >= 0.4
                                        ? 'bg-amber-400 text-stone-950 font-bold'
                                        : 'bg-secondary text-secondary-foreground font-medium';

                            return (
                                <div
                                    key={bucket.hour}
                                    className={cn(
                                        'rounded-xl p-2 text-center',
                                        bgClass,
                                    )}
                                >
                                    <p className="font-money text-[11px] font-semibold">
                                        {bucket.label}
                                    </p>
                                    <p className="font-money text-sm font-extrabold">
                                        {bucket.orders}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top 5 Menus + Low Stock Widget */}
                <div className="grid gap-5 lg:grid-cols-3">
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs lg:col-span-2">
                        <div className="flex items-center justify-between border-b px-5 py-3.5">
                            <h2 className="flex items-center gap-2 text-base font-bold">
                                <ShoppingBag className="size-4 text-primary" />
                                Top 5 Menu & Margin
                            </h2>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-2.5">Menu</th>
                                    <th className="px-4 py-2.5">Terjual</th>
                                    <th className="px-4 py-2.5">Omzet</th>
                                    <th className="px-4 py-2.5">Margin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.topMenus.map((menu) => (
                                    <tr key={menu.menu_item_id}>
                                        <td className="px-4 py-2.5 font-semibold">
                                            {menu.name}
                                        </td>
                                        <td className="font-money px-4 py-2.5">
                                            {menu.qty_sold}
                                        </td>
                                        <td className="font-money px-4 py-2.5 font-semibold">
                                            {formatRupiah(menu.revenue)}
                                        </td>
                                        <td className="font-money px-4 py-2.5 font-bold text-emerald-700">
                                            {menu.margin_percent}%
                                        </td>
                                    </tr>
                                ))}
                                {data.topMenus.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-6 text-center text-muted-foreground"
                                        >
                                            Belum ada transaksi pada rentang
                                            ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="text-base font-bold">
                                Peringatan Stok Menipis
                            </h2>
                            <Link
                                href="/admin/inventory"
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                Kelola Stok
                            </Link>
                        </div>
                        <div className="mt-3 space-y-2.5">
                            {data.lowStockIngredients.map((ing) => (
                                <div
                                    key={ing.id}
                                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs"
                                >
                                    <span className="font-semibold text-foreground">
                                        {ing.name}
                                    </span>
                                    <Badge variant="destructive">
                                        <span className="font-money">
                                            {ing.current_stock} /{' '}
                                            {ing.min_stock} {ing.unit}
                                        </span>
                                    </Badge>
                                </div>
                            ))}
                            {data.lowStockIngredients.length === 0 && (
                                <p className="py-6 text-center text-xs text-muted-foreground">
                                    Seluruh stok bahan baku dalam batas aman.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
