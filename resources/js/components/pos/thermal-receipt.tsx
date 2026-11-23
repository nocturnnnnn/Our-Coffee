import { Printer } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatDateWib, formatRupiah, formatTimeWib } from '@/lib/format';
import { cn } from '@/lib/utils';

export type ReceiptOrder = {
    id: number;
    order_number: string;
    queue_number: string;
    channel: string;
    order_type: string;
    customer_name: string | null;
    status: string;
    subtotal: number;
    discount_amount: number;
    discount_reason: string | null;
    total_amount: number;
    cashier_name: string | null;
    paid_at: string | null;
    created_at: string | null;
    payment: {
        method: string;
        method_label: string;
        status: string;
        amount: number;
        cash_received: number | null;
        change_amount: number | null;
    } | null;
    items: Array<{
        id: number;
        menu_item_id: number;
        menu_item_name: string;
        unit_price: number;
        modifiers_total: number;
        quantity: number;
        line_total: number;
        notes: string | null;
        modifiers: Array<{
            group_name: string;
            option_name: string;
            price_delta: number;
        }>;
    }>;
};

type ThermalReceiptProps = {
    order: ReceiptOrder | null;
    cafeSettings: {
        cafe_name: string;
        cafe_address: string;
        cafe_phone: string;
        receipt_footer: string;
    };
    open: boolean;
    onClose: () => void;
};

export function ThermalReceipt({
    order,
    cafeSettings,
    open,
    onClose,
}: ThermalReceiptProps) {
    const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');

    if (!order) {
        return null;
    }

    const timestamp = order.paid_at ?? order.created_at;

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Struk Pembayaran Thermal</DialogTitle>
                </DialogHeader>

                <div className="flex items-center justify-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={paperWidth === '58mm' ? 'default' : 'outline'}
                        onClick={() => setPaperWidth('58mm')}
                        className="min-h-10"
                    >
                        58mm
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={paperWidth === '80mm' ? 'default' : 'outline'}
                        onClick={() => setPaperWidth('80mm')}
                        className="min-h-10"
                    >
                        80mm
                    </Button>
                </div>

                <div className="flex justify-center overflow-x-auto py-2">
                    <div
                        className={cn(
                            'thermal-receipt-print rounded-lg border bg-white p-4 font-mono text-xs text-black shadow-xs',
                            paperWidth === '58mm' ? 'w-[220px]' : 'w-[300px]',
                        )}
                    >
                        <div className="border-b border-dashed border-black/40 pb-2 text-center">
                            <p className="text-sm font-bold uppercase">
                                {cafeSettings.cafe_name}
                            </p>
                            {cafeSettings.cafe_address && (
                                <p className="mt-0.5 text-[10px]">
                                    {cafeSettings.cafe_address}
                                </p>
                            )}
                            {cafeSettings.cafe_phone && (
                                <p className="text-[10px]">
                                    {cafeSettings.cafe_phone}
                                </p>
                            )}
                        </div>

                        <div className="space-y-0.5 border-b border-dashed border-black/40 py-2 text-[11px]">
                            <div className="flex justify-between">
                                <span>Antrean</span>
                                <span className="font-bold">
                                    #{order.queue_number}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Order</span>
                                <span>{order.order_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tipe</span>
                                <span className="uppercase">
                                    {order.order_type === 'dine_in'
                                        ? 'Dine-In'
                                        : 'Takeaway'}
                                </span>
                            </div>
                            {order.customer_name && (
                                <div className="flex justify-between">
                                    <span>Pelanggan</span>
                                    <span>{order.customer_name}</span>
                                </div>
                            )}
                            {order.cashier_name && (
                                <div className="flex justify-between">
                                    <span>Kasir</span>
                                    <span>{order.cashier_name}</span>
                                </div>
                            )}
                            {timestamp && (
                                <div className="flex justify-between">
                                    <span>Waktu</span>
                                    <span>
                                        {formatDateWib(timestamp)}{' '}
                                        {formatTimeWib(timestamp)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 border-b border-dashed border-black/40 py-2">
                            {order.items.map((item) => (
                                <div key={item.id} className="space-y-0.5">
                                    <div className="flex justify-between font-semibold">
                                        <span>
                                            {item.quantity}x{' '}
                                            {item.menu_item_name}
                                        </span>
                                        <span>
                                            {formatRupiah(item.line_total)}
                                        </span>
                                    </div>
                                    {item.modifiers.length > 0 && (
                                        <p className="pl-3 text-[10px] text-black/75">
                                            {item.modifiers
                                                .map((m) => m.option_name)
                                                .join(', ')}
                                        </p>
                                    )}
                                    {item.notes && (
                                        <p className="pl-3 text-[10px] italic">
                                            * {item.notes}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1 border-b border-dashed border-black/40 py-2 text-[11px]">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{formatRupiah(order.subtotal)}</span>
                            </div>
                            {order.discount_amount > 0 && (
                                <div className="flex justify-between">
                                    <span>Diskon</span>
                                    <span>
                                        -{formatRupiah(order.discount_amount)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-bold">
                                <span>TOTAL</span>
                                <span>{formatRupiah(order.total_amount)}</span>
                            </div>
                            {order.payment && (
                                <>
                                    <div className="flex justify-between pt-1">
                                        <span>
                                            Bayar ({order.payment.method_label})
                                        </span>
                                        <span>
                                            {formatRupiah(
                                                order.payment.cash_received ??
                                                    order.payment.amount,
                                            )}
                                        </span>
                                    </div>
                                    {order.payment.change_amount !== null && (
                                        <div className="flex justify-between">
                                            <span>Kembalian</span>
                                            <span>
                                                {formatRupiah(
                                                    order.payment.change_amount,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <p className="pt-3 text-center text-[10px]">
                            {cafeSettings.receipt_footer}
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="min-h-12"
                    >
                        Tutup
                    </Button>
                    <Button
                        type="button"
                        onClick={() => window.print()}
                        className="min-h-12 gap-2 font-bold"
                    >
                        <Printer className="size-4" />
                        Cetak Struk ({paperWidth})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
