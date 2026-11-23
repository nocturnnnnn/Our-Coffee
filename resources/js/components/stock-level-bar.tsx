import { cn } from '@/lib/utils';

type StockLevelBarProps = {
    currentStock: number;
    minStock: number;
    unit: string;
};

export function StockLevelBar({
    currentStock,
    minStock,
    unit,
}: StockLevelBarProps) {
    const isEmpty = currentStock <= 0;
    const isLow = !isEmpty && currentStock <= minStock;
    const targetMax = minStock > 0 ? minStock * 3 : Math.max(currentStock, 100);
    const percent = Math.max(
        0,
        Math.min(100, Math.round((currentStock / targetMax) * 100)),
    );

    const statusLabel = isEmpty ? 'Habis' : isLow ? 'Menipis' : 'Aman';
    const badgeClass = isEmpty
        ? 'bg-red-100 text-red-800 border-red-200'
        : isLow
          ? 'bg-amber-100 text-amber-900 border-amber-200'
          : 'bg-emerald-100 text-emerald-900 border-emerald-200';
    const barClass = isEmpty
        ? 'bg-red-600'
        : isLow
          ? 'bg-amber-600'
          : 'bg-emerald-600';

    return (
        <div className="min-w-40 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-money font-semibold text-foreground">
                    {currentStock.toLocaleString('id-ID', {
                        maximumFractionDigits: 2,
                    })}{' '}
                    {unit}
                </span>
                <span
                    className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        badgeClass,
                    )}
                >
                    {statusLabel}
                </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                    className={cn(
                        'h-full rounded-full transition-all',
                        barClass,
                    )}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <p className="font-money text-[11px] text-muted-foreground">
                Min:{' '}
                {minStock.toLocaleString('id-ID', { maximumFractionDigits: 2 })}{' '}
                {unit}
            </p>
        </div>
    );
}
