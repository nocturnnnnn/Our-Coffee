import { Head, router } from '@inertiajs/react';
import { Download, Filter } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/format';

type ReportProps = {
    filters: {
        start_date: string;
        end_date: string;
    };
    summary: {
        gross_sales: number;
        total_discount: number;
        net_revenue: number;
        total_cogs: number;
        gross_profit: number;
        gross_margin_percent: number;
        orders_count: number;
        voided_count: number;
    };
    dailyRows: Array<{
        date: string;
        orders: number;
        net_revenue: number;
        cogs: number;
        profit: number;
    }>;
    menuRows: Array<{
        menu_item_id: number;
        name: string;
        qty_sold: number;
        revenue: number;
        cogs: number;
        gross_profit: number;
        margin_percent: number;
    }>;
};

export default function AdminReportsIndex({
    filters,
    summary,
    dailyRows,
    menuRows,
}: ReportProps) {
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);

    const applyFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/reports',
            { start_date: startDate, end_date: endDate },
            { preserveState: true },
        );
    };

    const csvUrl = `/admin/reports/export?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;

    return (
        <>
            <Head title="Laporan Penjualan & Margin" />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Laporan Penjualan & Profitabilitas
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Analisa omzet bersih, HPP (BOM), laba kotor, serta
                            ekspor CSV.
                        </p>
                    </div>

                    <a href={csvUrl}>
                        <Button className="min-h-11 gap-2">
                            <Download className="size-4" />
                            Ekspor CSV
                        </Button>
                    </a>
                </div>

                <form
                    onSubmit={applyFilter}
                    className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-xs"
                >
                    <div className="space-y-1">
                        <Label htmlFor="rep-start">Dari Tanggal</Label>
                        <Input
                            id="rep-start"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="rep-end">Sampai Tanggal</Label>
                        <Input
                            id="rep-end"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <Button type="submit" variant="outline" className="gap-2">
                        <Filter className="size-4" />
                        Terapkan
                    </Button>
                </form>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border bg-card p-5 shadow-xs">
                        <p className="text-xs text-muted-foreground">
                            Omzet Bersih
                        </p>
                        <p className="font-money mt-1.5 text-xl font-extrabold text-primary">
                            {formatRupiah(summary.net_revenue)}
                        </p>
                        <p className="font-money mt-1 text-xs text-muted-foreground">
                            {summary.orders_count} transaksi (
                            {summary.voided_count} void)
                        </p>
                    </div>
                    <div className="rounded-2xl border bg-card p-5 shadow-xs">
                        <p className="text-xs text-muted-foreground">
                            Total HPP (COGS)
                        </p>
                        <p className="font-money mt-1.5 text-xl font-extrabold">
                            {formatRupiah(summary.total_cogs)}
                        </p>
                        <p className="font-money mt-1 text-xs text-muted-foreground">
                            Diskon: {formatRupiah(summary.total_discount)}
                        </p>
                    </div>
                    <div className="rounded-2xl border bg-card p-5 shadow-xs">
                        <p className="text-xs text-muted-foreground">
                            Laba Kotor
                        </p>
                        <p className="font-money mt-1.5 text-xl font-extrabold text-emerald-700">
                            {formatRupiah(summary.gross_profit)}
                        </p>
                    </div>
                    <div className="rounded-2xl border bg-card p-5 shadow-xs">
                        <p className="text-xs text-muted-foreground">
                            Gross Margin
                        </p>
                        <p className="font-money mt-1.5 text-xl font-extrabold text-emerald-700">
                            {summary.gross_margin_percent}%
                        </p>
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                        <div className="border-b px-5 py-3.5">
                            <h2 className="text-base font-bold">
                                Rekap Harian
                            </h2>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-2.5">Tanggal</th>
                                    <th className="px-4 py-2.5">Order</th>
                                    <th className="px-4 py-2.5">Omzet</th>
                                    <th className="px-4 py-2.5">Laba Kotor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {dailyRows.map((row) => (
                                    <tr key={row.date}>
                                        <td className="font-money px-4 py-2.5">
                                            {row.date}
                                        </td>
                                        <td className="font-money px-4 py-2.5">
                                            {row.orders}
                                        </td>
                                        <td className="font-money px-4 py-2.5 font-semibold">
                                            {formatRupiah(row.net_revenue)}
                                        </td>
                                        <td className="font-money px-4 py-2.5 font-semibold text-emerald-700">
                                            {formatRupiah(row.profit)}
                                        </td>
                                    </tr>
                                ))}
                                {dailyRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-6 text-center text-muted-foreground"
                                        >
                                            Tidak ada data pada rentang tanggal
                                            ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                        <div className="border-b px-5 py-3.5">
                            <h2 className="text-base font-bold">
                                Performa per Menu
                            </h2>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-2.5">Menu</th>
                                    <th className="px-4 py-2.5">Qty</th>
                                    <th className="px-4 py-2.5">Omzet</th>
                                    <th className="px-4 py-2.5">Margin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {menuRows.map((row) => (
                                    <tr key={row.menu_item_id}>
                                        <td className="px-4 py-2.5 font-semibold">
                                            {row.name}
                                        </td>
                                        <td className="font-money px-4 py-2.5">
                                            {row.qty_sold}
                                        </td>
                                        <td className="font-money px-4 py-2.5 font-semibold">
                                            {formatRupiah(row.revenue)}
                                        </td>
                                        <td className="font-money px-4 py-2.5 font-bold text-emerald-700">
                                            {row.margin_percent}%
                                        </td>
                                    </tr>
                                ))}
                                {menuRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-6 text-center text-muted-foreground"
                                        >
                                            Belum ada penjualan menu.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
