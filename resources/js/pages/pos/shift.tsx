import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Clock, Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateWib, formatRupiah, formatTimeWib } from '@/lib/format';
import { cn } from '@/lib/utils';

type ActiveShiftDetail = {
    id: number;
    opening_cash: number;
    cash_sales_total: number;
    non_cash_sales_total: number;
    expected_cash: number;
    orders_count: number;
    opened_at: string;
} | null;

type ClosedShiftRow = {
    id: number;
    cashier_name: string;
    opening_cash: number;
    expected_cash: number;
    actual_cash: number;
    variance: number;
    variance_reason: string | null;
    opened_at: string;
    closed_at: string | null;
};

const OPENING_PRESETS = [300000, 500000, 1000000];

export default function PosShiftPage({
    activeShiftDetail,
    recentShifts,
}: {
    activeShiftDetail: ActiveShiftDetail;
    recentShifts: ClosedShiftRow[];
}) {
    const openForm = useForm({
        opening_cash: '500000',
    });

    const closeForm = useForm({
        actual_cash: activeShiftDetail
            ? String(activeShiftDetail.expected_cash)
            : '0',
        variance_reason: '',
    });

    const handleOpen = (e: React.FormEvent) => {
        e.preventDefault();
        openForm.transform((data) => ({
            opening_cash: Number(data.opening_cash) || 0,
        }));
        openForm.post('/pos/shift/open');
    };

    const handleClose = (e: React.FormEvent) => {
        e.preventDefault();
        closeForm.transform((data) => ({
            actual_cash: Number(data.actual_cash) || 0,
            variance_reason: data.variance_reason.trim() || null,
        }));
        closeForm.post('/pos/shift/close');
    };

    const actualCashNum = Number(closeForm.data.actual_cash) || 0;
    const variance = activeShiftDetail
        ? actualCashNum - activeShiftDetail.expected_cash
        : 0;

    return (
        <>
            <Head title="Shift Kasir" />
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Manajemen Shift Kasir
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Buka shift dengan modal awal laci kas, atau lakukan
                        rekonsiliasi kas akhir shift.
                    </p>
                </div>

                {!activeShiftDetail ? (
                    <div className="rounded-2xl border bg-card p-6 shadow-xs">
                        <div className="flex items-center gap-3 border-b pb-4">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Unlock className="size-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">
                                    Buka Shift Baru
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Masukkan jumlah uang tunai awal di laci
                                    kasir untuk mengaktifkan layar POS.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleOpen} className="mt-5 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="opening-cash">
                                    Modal Awal Laci Kas (Rp)
                                </Label>
                                <Input
                                    id="opening-cash"
                                    type="number"
                                    min={0}
                                    value={openForm.data.opening_cash}
                                    onChange={(e) =>
                                        openForm.setData(
                                            'opening_cash',
                                            e.target.value,
                                        )
                                    }
                                    className="font-money h-14 text-lg font-bold"
                                    required
                                />
                                {openForm.errors.opening_cash && (
                                    <p className="text-xs text-destructive">
                                        {openForm.errors.opening_cash}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {OPENING_PRESETS.map((preset) => (
                                    <Button
                                        key={preset}
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            openForm.setData(
                                                'opening_cash',
                                                String(preset),
                                            )
                                        }
                                        className="font-money min-h-12"
                                    >
                                        {formatRupiah(preset)}
                                    </Button>
                                ))}
                            </div>

                            <Button
                                type="submit"
                                disabled={openForm.processing}
                                className="min-h-14 w-full gap-2 text-base font-bold"
                            >
                                <Clock className="size-5" />
                                Buka Shift & Masuk POS
                            </Button>
                        </form>
                    </div>
                ) : (
                    <div className="rounded-2xl border bg-card p-6 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold">
                                        Shift Aktif #{activeShiftDetail.id}
                                    </h2>
                                    <Badge className="bg-emerald-600 text-white">
                                        Terbuka
                                    </Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Dibuka{' '}
                                    {formatDateWib(activeShiftDetail.opened_at)}{' '}
                                    {formatTimeWib(activeShiftDetail.opened_at)}{' '}
                                    WIB · {activeShiftDetail.orders_count}{' '}
                                    transaksi lunas
                                </p>
                            </div>

                            <Link href="/pos">
                                <Button className="min-h-12 gap-2 font-bold">
                                    Lanjut ke POS
                                    <ArrowRight className="size-4" />
                                </Button>
                            </Link>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-4">
                            <div className="rounded-xl bg-muted/60 p-3.5">
                                <p className="text-xs text-muted-foreground">
                                    Modal Awal
                                </p>
                                <p className="font-money mt-1 text-base font-bold">
                                    {formatRupiah(
                                        activeShiftDetail.opening_cash,
                                    )}
                                </p>
                            </div>
                            <div className="rounded-xl bg-muted/60 p-3.5">
                                <p className="text-xs text-muted-foreground">
                                    Penjualan Tunai
                                </p>
                                <p className="font-money mt-1 text-base font-bold text-emerald-700">
                                    {formatRupiah(
                                        activeShiftDetail.cash_sales_total,
                                    )}
                                </p>
                            </div>
                            <div className="rounded-xl bg-muted/60 p-3.5">
                                <p className="text-xs text-muted-foreground">
                                    Non-Tunai (EDC/QRIS)
                                </p>
                                <p className="font-money mt-1 text-base font-bold">
                                    {formatRupiah(
                                        activeShiftDetail.non_cash_sales_total,
                                    )}
                                </p>
                            </div>
                            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                                <p className="text-xs text-muted-foreground">
                                    Kas Seharusnya
                                </p>
                                <p className="font-money mt-1 text-base font-extrabold text-primary">
                                    {formatRupiah(
                                        activeShiftDetail.expected_cash,
                                    )}
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={handleClose}
                            className="mt-6 space-y-4 border-t pt-5"
                        >
                            <h3 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
                                Tutup Shift & Rekonsiliasi Laci Kas
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="actual-cash">
                                        Uang Fisik Aktual di Laci (Rp)
                                    </Label>
                                    <Input
                                        id="actual-cash"
                                        type="number"
                                        min={0}
                                        value={closeForm.data.actual_cash}
                                        onChange={(e) =>
                                            closeForm.setData(
                                                'actual_cash',
                                                e.target.value,
                                            )
                                        }
                                        className="font-money h-12 text-base font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Selisih Kas (Variance)</Label>
                                    <div
                                        className={cn(
                                            'font-money flex h-12 items-center rounded-md border px-3 text-base font-bold',
                                            variance === 0
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                                : 'border-amber-300 bg-amber-50 text-amber-900',
                                        )}
                                    >
                                        {variance === 0
                                            ? 'Sesuai (Rp 0)'
                                            : `${variance > 0 ? '+' : '-'}${formatRupiah(Math.abs(variance))}`}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="variance-reason">
                                    Alasan Selisih{' '}
                                    {variance !== 0 ? '(Wajib)' : '(Opsional)'}
                                </Label>
                                <Input
                                    id="variance-reason"
                                    value={closeForm.data.variance_reason}
                                    onChange={(e) =>
                                        closeForm.setData(
                                            'variance_reason',
                                            e.target.value,
                                        )
                                    }
                                    required={variance !== 0}
                                    placeholder="Jelaskan penyebab selisih jika ada"
                                    className="h-12"
                                />
                                {closeForm.errors.variance_reason && (
                                    <p className="text-xs text-destructive">
                                        {closeForm.errors.variance_reason}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={closeForm.processing}
                                className="min-h-12 gap-2 font-bold"
                            >
                                <Lock className="size-4" />
                                Tutup Shift Sekarang
                            </Button>
                        </form>
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                    <div className="border-b px-5 py-3.5">
                        <h2 className="text-base font-bold">
                            Riwayat Tutup Shift Terbaru
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Kasir</th>
                                    <th className="px-4 py-3">Tutup</th>
                                    <th className="px-4 py-3">Modal Awal</th>
                                    <th className="px-4 py-3">Seharusnya</th>
                                    <th className="px-4 py-3">Aktual</th>
                                    <th className="px-4 py-3">Selisih</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {recentShifts.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-4 py-3 font-semibold">
                                            {row.cashier_name}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {row.closed_at
                                                ? `${formatDateWib(row.closed_at)} ${formatTimeWib(row.closed_at)}`
                                                : '-'}
                                        </td>
                                        <td className="font-money px-4 py-3">
                                            {formatRupiah(row.opening_cash)}
                                        </td>
                                        <td className="font-money px-4 py-3">
                                            {formatRupiah(row.expected_cash)}
                                        </td>
                                        <td className="font-money px-4 py-3">
                                            {formatRupiah(row.actual_cash)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={cn(
                                                    'font-money font-semibold',
                                                    row.variance === 0
                                                        ? 'text-emerald-700'
                                                        : 'text-amber-800',
                                                )}
                                            >
                                                {row.variance >= 0 ? '' : '-'}
                                                {formatRupiah(
                                                    Math.abs(row.variance),
                                                )}
                                            </span>
                                            {row.variance_reason && (
                                                <p className="text-xs text-muted-foreground">
                                                    {row.variance_reason}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {recentShifts.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-6 text-center text-muted-foreground"
                                        >
                                            Belum ada riwayat shift yang
                                            ditutup.
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
