import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';

type NumPadProps = {
    totalAmount: number;
    value: string;
    onChange: (value: string) => void;
};

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0'];

export function NumPad({ totalAmount, value, onChange }: NumPadProps) {
    const cashReceived = Number(value) || 0;
    const change = cashReceived - totalAmount;

    const append = (chunk: string) => {
        const next = value === '0' ? chunk : `${value}${chunk}`;
        if (next.length > 9) {
            return;
        }
        onChange(next);
    };

    const backspace = () => {
        onChange(value.slice(0, -1));
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/50 p-3 text-xs">
                <div>
                    <p className="text-muted-foreground">Uang Diterima</p>
                    <p className="font-money text-base font-bold text-foreground">
                        {formatRupiah(cashReceived)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-muted-foreground">Kembalian</p>
                    <p
                        className={cn(
                            'font-money text-base font-bold',
                            change < 0 ? 'text-red-700' : 'text-emerald-700',
                        )}
                    >
                        {change < 0
                            ? `Kurang ${formatRupiah(Math.abs(change))}`
                            : formatRupiah(change)}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onChange(String(totalAmount))}
                    className="min-h-12 flex-1 text-xs font-bold"
                >
                    Uang Pas
                </Button>
                {QUICK_AMOUNTS.map((preset) => (
                    <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        onClick={() => onChange(String(preset))}
                        className="font-money min-h-12 px-2.5 text-xs font-semibold"
                    >
                        {preset / 1000}k
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
                {KEYS.map((key) => (
                    <Button
                        key={key}
                        type="button"
                        variant="outline"
                        onClick={() => append(key)}
                        className="font-money min-h-[60px] min-w-[60px] rounded-xl text-lg font-bold"
                    >
                        {key}
                    </Button>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    onClick={backspace}
                    className="min-h-[60px] min-w-[60px] rounded-xl"
                    aria-label="Hapus digit"
                >
                    <Delete className="size-5" />
                </Button>
            </div>

            <Button
                type="button"
                variant="ghost"
                onClick={() => onChange('')}
                className="min-h-12 w-full text-xs text-muted-foreground"
            >
                Bersihkan Nominal
            </Button>
        </div>
    );
}
