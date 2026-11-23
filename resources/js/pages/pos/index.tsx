import { Head } from '@inertiajs/react';
import {
    Banknote,
    Ban,
    CheckCircle2,
    Coffee,
    Percent,
    Printer,
    Search,
    Trash2,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { ModifierSheet } from '@/components/kiosk/modifier-sheet';
import { NumPad } from '@/components/pos/num-pad';
import { SupervisorPinModal } from '@/components/pos/supervisor-pin-modal';
import {
    ThermalReceipt,
    type ReceiptOrder,
} from '@/components/pos/thermal-receipt';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePolling } from '@/hooks/use-polling';
import { formatRupiah, formatTimeWib } from '@/lib/format';
import { jsonRequest } from '@/lib/http';
import { cn } from '@/lib/utils';
import type {
    KioskCartItem,
    KioskCategory,
    KioskMenuItem,
} from '@/stores/kiosk-cart-store';

type PosProps = {
    categories: KioskCategory[];
    pendingKioskOrders: ReceiptOrder[];
    recentOrders: ReceiptOrder[];
    cafeSettings: {
        cafe_name: string;
        cafe_address: string;
        cafe_phone: string;
        receipt_footer: string;
    };
};

type PaymentMethodTab = 'cash';

export default function PosIndexPage({
    categories: initialCategories,
    pendingKioskOrders: initialPending,
    recentOrders: initialRecent,
    cafeSettings,
}: PosProps) {
    const [categories, setCategories] =
        useState<KioskCategory[]>(initialCategories);
    const [pendingKioskOrders, setPendingKioskOrders] =
        useState<ReceiptOrder[]>(initialPending);
    const [recentOrders, setRecentOrders] =
        useState<ReceiptOrder[]>(initialRecent);

    const [col1Tab, setCol1Tab] = useState<'pending' | 'history'>('pending');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        null,
    );
    const [searchQuery, setSearchQuery] = useState('');

    // Active Bill state: either settling a Pending Kiosk Order OR building a Walk-In Cart
    const [selectedKioskOrder, setSelectedKioskOrder] =
        useState<ReceiptOrder | null>(null);
    const [walkInCart, setWalkInCart] = useState<KioskCartItem[]>([]);
    const [walkInOrderType, setWalkInOrderType] = useState<
        'dine_in' | 'takeaway'
    >('dine_in');
    const [walkInCustomerName, setWalkInCustomerName] = useState('');

    // ModifierSheet for Walk-In menu items
    const [sheetMenu, setSheetMenu] = useState<KioskMenuItem | null>(null);

    // Discount & Payment state (Cash only)
    const paymentMethod: PaymentMethodTab = 'cash';
    const [cashInput, setCashInput] = useState('');
    const [discountAuth, setDiscountAuth] = useState<{
        amount: number;
        reason: string;
        pin: string;
    } | null>(null);

    const [pinModal, setPinModal] = useState<{
        open: boolean;
        mode: 'discount' | 'void';
        targetOrderId?: number;
    }>({ open: false, mode: 'discount' });
    const [pinError, setPinError] = useState<string | null>(null);
    const [pinSubmitting, setPinSubmitting] = useState(false);

    const [billError, setBillError] = useState<string | null>(null);
    const [settling, setSettling] = useState(false);

    const [receiptOrder, setReceiptOrder] = useState<ReceiptOrder | null>(null);

    const refreshQueue = useCallback(async () => {
        try {
            const res = await jsonRequest<{
                pendingKioskOrders: ReceiptOrder[];
                recentOrders: ReceiptOrder[];
                availability: Record<
                    number,
                    {
                        is_available: boolean;
                        reason: string | null;
                        max_servings: number | null;
                    }
                >;
            }>('/pos/queue');

            if (!res.ok) {
                return;
            }

            setPendingKioskOrders(res.data.pendingKioskOrders);
            setRecentOrders(res.data.recentOrders);
            setCategories((prev) =>
                prev.map((cat) => ({
                    ...cat,
                    items: cat.items.map((item) => {
                        const avail = res.data.availability[item.id];
                        return avail
                            ? {
                                  ...item,
                                  is_available: avail.is_available,
                                  unavailable_reason: avail.reason,
                                  max_servings: avail.max_servings,
                              }
                            : item;
                    }),
                })),
            );
        } catch {
            // Silent retry on next poll
        }
    }, []);

    usePolling(refreshQueue, 3000, true);

    const allMenus = categories.flatMap((cat) => cat.items);
    const filteredMenus = allMenus.filter((item) => {
        if (
            selectedCategoryId !== null &&
            item.category_id !== selectedCategoryId
        ) {
            return false;
        }
        if (
            searchQuery.trim() &&
            !item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        ) {
            return false;
        }
        return true;
    });

    const walkInSubtotal = walkInCart.reduce(
        (sum, item) =>
            sum + (item.unitPrice + item.modifiersTotal) * item.quantity,
        0,
    );
    const activeSubtotal = selectedKioskOrder
        ? selectedKioskOrder.subtotal
        : walkInSubtotal;
    const activeDiscount = discountAuth
        ? Math.min(activeSubtotal, discountAuth.amount)
        : (selectedKioskOrder?.discount_amount ?? 0);
    const activeTotal = Math.max(0, activeSubtotal - activeDiscount);

    const cashReceivedNum = Number(cashInput) || 0;
    const hasBillItems = selectedKioskOrder ? true : walkInCart.length > 0;
    const canConfirmPayment =
        hasBillItems &&
        !settling &&
        (paymentMethod !== 'cash' || cashReceivedNum >= activeTotal);

    const handleAddWalkInItem = (
        incoming: Omit<KioskCartItem, 'lineId'> & { lineId?: string },
    ) => {
        setSelectedKioskOrder(null);
        setBillError(null);

        const lineId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setWalkInCart((prev) => [...prev, { ...incoming, lineId }]);
    };

    const handleSettle = async () => {
        if (!canConfirmPayment) {
            return;
        }
        setSettling(true);
        setBillError(null);

        try {
            const url = selectedKioskOrder
                ? `/pos/orders/${selectedKioskOrder.id}/pay`
                : '/pos/orders';

            const body = selectedKioskOrder
                ? {
                      payment_method: paymentMethod,
                      cash_received:
                          paymentMethod === 'cash' ? cashReceivedNum : null,
                      discount_amount: discountAuth?.amount ?? 0,
                      discount_reason: discountAuth?.reason ?? null,
                      admin_pin: discountAuth?.pin ?? null,
                  }
                : {
                      order_type: walkInOrderType,
                      customer_name: walkInCustomerName.trim() || null,
                      payment_method: paymentMethod,
                      cash_received:
                          paymentMethod === 'cash' ? cashReceivedNum : null,
                      discount_amount: discountAuth?.amount ?? 0,
                      discount_reason: discountAuth?.reason ?? null,
                      admin_pin: discountAuth?.pin ?? null,
                      items: walkInCart.map((item) => ({
                          menu_item_id: item.menuItemId,
                          quantity: item.quantity,
                          notes: item.notes || null,
                          modifier_option_ids: item.selectedModifiers.map(
                              (m) => m.optionId,
                          ),
                      })),
                  };

            const res = await jsonRequest<{
                order?: ReceiptOrder;
                message?: string;
            }>(url, {
                method: 'POST',
                body,
            });

            if (!res.ok || !res.data.order) {
                setBillError(
                    res.data.message ?? 'Gagal menyelesaikan pembayaran.',
                );
                return;
            }

            setReceiptOrder(res.data.order);
            setSelectedKioskOrder(null);
            setWalkInCart([]);
            setWalkInCustomerName('');
            setCashInput('');
            setDiscountAuth(null);
            await refreshQueue();
        } catch {
            setBillError(
                'Terjadi kesalahan jaringan saat memproses pembayaran.',
            );
        } finally {
            setSettling(false);
        }
    };

    const handlePinModalConfirm = async (payload: {
        pin: string;
        reason: string;
        discountAmount?: number;
    }) => {
        setPinError(null);

        if (pinModal.mode === 'discount') {
            setDiscountAuth({
                amount: payload.discountAmount ?? 0,
                reason: payload.reason,
                pin: payload.pin,
            });
            setPinModal({ open: false, mode: 'discount' });
            return;
        }

        if (pinModal.mode === 'void' && pinModal.targetOrderId) {
            setPinSubmitting(true);
            try {
                const res = await jsonRequest<{ message?: string }>(
                    `/pos/orders/${pinModal.targetOrderId}/void`,
                    {
                        method: 'POST',
                        body: {
                            reason: payload.reason,
                            admin_pin: payload.pin,
                        },
                    },
                );

                if (!res.ok) {
                    setPinError(res.data.message ?? 'PIN Admin tidak valid.');
                    return;
                }

                setPinModal({ open: false, mode: 'void' });
                await refreshQueue();
            } catch {
                setPinError('Gagal memproses void pesanan.');
            } finally {
                setPinSubmitting(false);
            }
        }
    };

    return (
        <>
            <Head title="POS Kasir" />
            <div className="grid h-[calc(100vh-3rem)] grid-cols-12 gap-4 overflow-hidden">
                {/* COLUMN 1: Pending Kiosk & Shift History */}
                <section className="col-span-3 flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs">
                    <div className="grid grid-cols-2 gap-1 border-b p-2">
                        <button
                            type="button"
                            onClick={() => setCol1Tab('pending')}
                            className={cn(
                                'min-h-12 rounded-xl px-2 text-xs font-bold transition-colors',
                                col1Tab === 'pending'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted',
                            )}
                        >
                            Pending Kiosk ({pendingKioskOrders.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setCol1Tab('history')}
                            className={cn(
                                'min-h-12 rounded-xl px-2 text-xs font-bold transition-colors',
                                col1Tab === 'history'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted',
                            )}
                        >
                            Riwayat ({recentOrders.length})
                        </button>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto p-3">
                        {col1Tab === 'pending' ? (
                            pendingKioskOrders.length === 0 ? (
                                <p className="py-10 text-center text-xs text-muted-foreground">
                                    Tidak ada pesanan Kiosk menunggu bayar.
                                </p>
                            ) : (
                                pendingKioskOrders.map((order) => (
                                    <button
                                        key={order.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedKioskOrder(order);
                                            setWalkInCart([]);
                                            setDiscountAuth(null);
                                            setCashInput('');
                                            setBillError(null);
                                        }}
                                        className={cn(
                                            'min-h-12 w-full rounded-xl border p-3 text-left transition-colors',
                                            selectedKioskOrder?.id === order.id
                                                ? 'border-primary bg-primary/10'
                                                : 'hover:bg-muted/50',
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-money text-base font-extrabold text-primary">
                                                #{order.queue_number}
                                            </span>
                                            <Badge variant="secondary">
                                                {order.order_type === 'dine_in'
                                                    ? 'Dine-In'
                                                    : 'Takeaway'}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-xs font-semibold">
                                            {order.customer_name ||
                                                'Pelanggan Kiosk'}
                                        </p>
                                        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                                            <span>
                                                {order.items.length} item
                                            </span>
                                            <span className="font-money font-bold text-foreground">
                                                {formatRupiah(
                                                    order.total_amount,
                                                )}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )
                        ) : (
                            recentOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="space-y-2 rounded-xl border p-3 text-xs"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-money font-extrabold">
                                            #{order.queue_number}
                                        </span>
                                        <Badge
                                            variant={
                                                order.status === 'voided'
                                                    ? 'destructive'
                                                    : 'outline'
                                            }
                                        >
                                            {order.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>
                                            {order.paid_at
                                                ? formatTimeWib(order.paid_at)
                                                : ''}
                                        </span>
                                        <span className="font-money font-bold text-foreground">
                                            {formatRupiah(order.total_amount)}
                                        </span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setReceiptOrder(order)
                                            }
                                            className="min-h-12 flex-1 gap-1 text-xs"
                                        >
                                            <Printer className="size-3.5" />
                                            Struk
                                        </Button>
                                        {order.status !== 'voided' && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setPinError(null);
                                                    setPinModal({
                                                        open: true,
                                                        mode: 'void',
                                                        targetOrderId: order.id,
                                                    });
                                                }}
                                                className="min-h-12 gap-1 text-xs text-destructive"
                                            >
                                                <Ban className="size-3.5" />
                                                Void
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* COLUMN 2: Walk-In Menu Grid */}
                <section className="col-span-5 flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs">
                    <div className="space-y-2.5 border-b p-3">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari menu walk-in..."
                                className="h-12 pl-9"
                            />
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            <button
                                type="button"
                                onClick={() => setSelectedCategoryId(null)}
                                className={cn(
                                    'min-h-12 shrink-0 rounded-xl px-3.5 text-xs font-bold transition-colors',
                                    selectedCategoryId === null
                                        ? 'bg-espresso text-oat'
                                        : 'bg-secondary text-espresso',
                                )}
                            >
                                Semua
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() =>
                                        setSelectedCategoryId(cat.id)
                                    }
                                    className={cn(
                                        'min-h-12 shrink-0 rounded-xl px-3.5 text-xs font-bold transition-colors',
                                        selectedCategoryId === cat.id
                                            ? 'bg-espresso text-oat'
                                            : 'bg-secondary text-espresso',
                                    )}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-3">
                        {filteredMenus.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                disabled={!item.is_available}
                                onClick={() => {
                                    if (item.modifier_groups.length === 0) {
                                        handleAddWalkInItem({
                                            menuItemId: item.id,
                                            name: item.name,
                                            imageUrl: item.image_url,
                                            unitPrice: item.price,
                                            modifiersTotal: 0,
                                            quantity: 1,
                                            notes: '',
                                            selectedModifiers: [],
                                        });
                                    } else {
                                        setSheetMenu(item);
                                    }
                                }}
                                className={cn(
                                    'flex min-h-24 flex-col justify-between rounded-xl border bg-background p-3 text-left transition-all',
                                    item.is_available
                                        ? 'hover:border-primary hover:bg-primary/5'
                                        : 'cursor-not-allowed opacity-50',
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm leading-snug font-bold">
                                        {item.name}
                                    </p>
                                    {!item.is_available ? (
                                        <Badge variant="destructive">
                                            HABIS
                                        </Badge>
                                    ) : (
                                        <Coffee className="size-4 shrink-0 text-muted-foreground" />
                                    )}
                                </div>
                                <p className="font-money mt-2 text-sm font-extrabold text-primary">
                                    {formatRupiah(item.price)}
                                </p>
                            </button>
                        ))}
                    </div>
                </section>

                {/* COLUMN 3: Active Bill, NumPad & Settlement */}
                <section className="col-span-4 flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <div>
                            <h2 className="text-base font-extrabold">
                                {selectedKioskOrder
                                    ? `Tiket Kiosk #${selectedKioskOrder.queue_number}`
                                    : 'Pesanan Walk-In'}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {selectedKioskOrder
                                    ? selectedKioskOrder.order_number
                                    : 'Pilih menu di kolom tengah'}
                            </p>
                        </div>
                        {(selectedKioskOrder || walkInCart.length > 0) && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedKioskOrder(null);
                                    setWalkInCart([]);
                                    setDiscountAuth(null);
                                    setCashInput('');
                                }}
                                className="min-h-12 text-xs text-destructive"
                            >
                                Reset
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto p-4">
                        {!selectedKioskOrder && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setWalkInOrderType('dine_in')
                                    }
                                    className={cn(
                                        'min-h-12 rounded-xl border text-xs font-bold',
                                        walkInOrderType === 'dine_in'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'bg-background',
                                    )}
                                >
                                    Dine-In
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setWalkInOrderType('takeaway')
                                    }
                                    className={cn(
                                        'min-h-12 rounded-xl border text-xs font-bold',
                                        walkInOrderType === 'takeaway'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'bg-background',
                                    )}
                                >
                                    Takeaway
                                </button>
                                <Input
                                    value={walkInCustomerName}
                                    onChange={(e) =>
                                        setWalkInCustomerName(e.target.value)
                                    }
                                    placeholder="Nama pelanggan (opsional)"
                                    className="col-span-2 h-12 text-xs"
                                />
                            </div>
                        )}

                        {billError && (
                            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                                {billError}
                            </p>
                        )}

                        {selectedKioskOrder ? (
                            <div className="space-y-2">
                                {selectedKioskOrder.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between rounded-xl border bg-muted/30 p-2.5 text-xs"
                                    >
                                        <div>
                                            <p className="font-bold">
                                                {item.quantity}x{' '}
                                                {item.menu_item_name}
                                            </p>
                                            {item.modifiers.length > 0 && (
                                                <p className="text-muted-foreground">
                                                    {item.modifiers
                                                        .map(
                                                            (m) =>
                                                                m.option_name,
                                                        )
                                                        .join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <span className="font-money font-bold">
                                            {formatRupiah(item.line_total)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : walkInCart.length === 0 ? (
                            <p className="py-6 text-center text-xs text-muted-foreground">
                                Belum ada item di keranjang POS.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {walkInCart.map((item) => (
                                    <div
                                        key={item.lineId}
                                        className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 p-2.5 text-xs"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-bold">
                                                {item.quantity}x {item.name}
                                            </p>
                                            {item.selectedModifiers.length >
                                                0 && (
                                                <p className="truncate text-muted-foreground">
                                                    {item.selectedModifiers
                                                        .map(
                                                            (m) => m.optionName,
                                                        )
                                                        .join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <span className="font-money font-bold">
                                            {formatRupiah(
                                                (item.unitPrice +
                                                    item.modifiersTotal) *
                                                    item.quantity,
                                            )}
                                        </span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                setWalkInCart((prev) =>
                                                    prev.filter(
                                                        (c) =>
                                                            c.lineId !==
                                                            item.lineId,
                                                    ),
                                                )
                                            }
                                            className="min-h-12 min-w-12"
                                            aria-label="Hapus"
                                        >
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {hasBillItems && (
                            <>
                                <div className="space-y-1.5 rounded-xl border bg-muted/40 p-3 text-xs">
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span className="font-money font-semibold">
                                            {formatRupiah(activeSubtotal)}
                                        </span>
                                    </div>
                                    {activeDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-700">
                                            <span>Diskon Manual</span>
                                            <span className="font-money font-semibold">
                                                -{formatRupiah(activeDiscount)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between border-t pt-1.5 text-base font-extrabold">
                                        <span>Total Tagihan</span>
                                        <span className="font-money text-primary">
                                            {formatRupiah(activeTotal)}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setPinError(null);
                                        setPinModal({
                                            open: true,
                                            mode: 'discount',
                                        });
                                    }}
                                    className="min-h-12 w-full gap-2 text-xs font-bold"
                                >
                                    <Percent className="size-4" />
                                    {discountAuth
                                        ? `Ubah Diskon (${formatRupiah(discountAuth.amount)})`
                                        : 'Terapkan Diskon Manual (PIN Admin)'}
                                </Button>

                                <div className="grid grid-cols-1">
                                    <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary bg-primary text-sm font-bold text-white shadow-xs">
                                        <Banknote className="size-4" />
                                        Pembayaran Tunai (Cash Only)
                                    </div>
                                </div>

                                <NumPad
                                    totalAmount={activeTotal}
                                    value={cashInput}
                                    onChange={setCashInput}
                                />
                            </>
                        )}
                    </div>

                    <div className="border-t p-3">
                        <Button
                            type="button"
                            disabled={!canConfirmPayment}
                            onClick={() => void handleSettle()}
                            className="min-h-14 w-full gap-2 rounded-xl text-base font-extrabold"
                        >
                            <CheckCircle2 className="size-5" />
                            {settling
                                ? 'Memproses...'
                                : `Lunasi ${formatRupiah(activeTotal)}`}
                        </Button>
                    </div>
                </section>
            </div>

            <ModifierSheet
                menuItem={sheetMenu}
                open={sheetMenu !== null}
                onClose={() => setSheetMenu(null)}
                onConfirm={handleAddWalkInItem}
            />

            <SupervisorPinModal
                open={pinModal.open}
                mode={pinModal.mode}
                maxDiscount={activeSubtotal}
                errorMessage={pinError}
                submitting={pinSubmitting}
                onClose={() => setPinModal({ ...pinModal, open: false })}
                onConfirm={(payload) => void handlePinModalConfirm(payload)}
            />

            <ThermalReceipt
                order={receiptOrder}
                cafeSettings={cafeSettings}
                open={receiptOrder !== null}
                onClose={() => setReceiptOrder(null)}
            />
        </>
    );
}
