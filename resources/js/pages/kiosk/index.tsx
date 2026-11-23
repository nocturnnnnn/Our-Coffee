import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Banknote,
    CheckCircle2,
    Coffee,
    Croissant,
    CupSoda,
    Edit2,
    Minus,
    Plus,
    RefreshCw,
    ShoppingBag,
    Sparkles,
    Store,
    Trash2,
    Utensils,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ModifierSheet } from '@/components/kiosk/modifier-sheet';
import { PinExitModal } from '@/components/kiosk/pin-exit-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePolling } from '@/hooks/use-polling';
import { formatRupiah } from '@/lib/format';
import { jsonRequest } from '@/lib/http';
import { cn } from '@/lib/utils';
import {
    useKioskCartStore,
    type KioskCartItem,
    type KioskCategory,
    type KioskMenuItem,
} from '@/stores/kiosk-cart-store';

type KioskProps = {
    device: {
        id: number;
        name: string;
    };
    isLocalDemo: boolean;
    settings: {
        cafe_name: string;
        idle_timeout_seconds: number;
        idle_warning_seconds: number;
        confirmation_reset_seconds: number;
        qris_expiry_seconds: number;
    };
    categories: KioskCategory[];
};

type ActiveOrder = {
    id: number;
    order_number: string;
    queue_number: string;
    status: string;
    order_type: string;
    customer_name: string | null;
    total_amount: number;
};

type ActivePayment = {
    id: number;
    method: string;
    status: string;
    qris_reference: string | null;
    qris_payload: string | null;
    expires_at: string | null;
};

type ConflictEntry = {
    menu_item_id: number;
    menu_item_name: string;
    reason: string;
};

function CategoryIcon({ icon }: { icon: string | null }) {
    switch (icon) {
        case 'sparkles':
            return <Sparkles className="size-6 shrink-0" />;
        case 'cup-soda':
            return <CupSoda className="size-6 shrink-0" />;
        case 'croissant':
            return <Croissant className="size-6 shrink-0" />;
        case 'utensils':
            return <Utensils className="size-6 shrink-0" />;
        default:
            return <Coffee className="size-6 shrink-0" />;
    }
}

function QrMatrixSvg({ payload }: { payload: string }) {
    const size = 21;
    const cells = useMemo(() => {
        const grid: boolean[][] = [];
        let seed = 0;
        for (let i = 0; i < payload.length; i++) {
            seed = (seed * 31 + payload.charCodeAt(i)) >>> 0;
        }

        const isFinder = (r: number, c: number) =>
            (r < 7 && c < 7) ||
            (r < 7 && c >= size - 7) ||
            (r >= size - 7 && c < 7);

        for (let r = 0; r < size; r++) {
            const row: boolean[] = [];
            for (let c = 0; c < size; c++) {
                if (isFinder(r, c)) {
                    const lr = r >= size - 7 ? r - (size - 7) : r;
                    const lc = c >= size - 7 ? c - (size - 7) : c;
                    const outer = lr === 0 || lr === 6 || lc === 0 || lc === 6;
                    const inner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
                    row.push(outer || inner);
                } else {
                    seed = (seed * 1664525 + 1013904223) >>> 0;
                    row.push(((seed >>> 24) & 1) === 1);
                }
            }
            grid.push(row);
        }
        return grid;
    }, [payload]);

    return (
        <svg
            viewBox={`0 0 ${size} ${size}`}
            className="size-56 rounded-2xl border-8 border-white bg-white shadow-md"
            role="img"
            aria-label="Kode QRIS Pembayaran"
        >
            {cells.map((row, r) =>
                row.map(
                    (filled, c) =>
                        filled && (
                            <rect
                                key={`${r}-${c}`}
                                x={c}
                                y={r}
                                width={1}
                                height={1}
                                fill="#1c120d"
                            />
                        ),
                ),
            )}
        </svg>
    );
}

export default function KioskIndexPage({
    device,
    isLocalDemo,
    settings,
    categories: initialCategories,
}: KioskProps) {
    const {
        step,
        orderType,
        customerName,
        items,
        setStep,
        setOrderType,
        setCustomerName,
        addOrUpdateItem,
        updateQuantity,
        removeItem,
        removeItemsByMenuIds,
        clearCart,
        resetSession,
    } = useKioskCartStore();

    const [categories, setCategories] =
        useState<KioskCategory[]>(initialCategories);
    const [activeCategoryId, setActiveCategoryId] = useState<number>(
        initialCategories[0]?.id ?? 0,
    );

    const [sheetMenu, setSheetMenu] = useState<KioskMenuItem | null>(null);
    const [editingCartItem, setEditingCartItem] =
        useState<KioskCartItem | null>(null);

    const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
    const [activePayment, setActivePayment] = useState<ActivePayment | null>(
        null,
    );
    const [qrisSecondsLeft, setQrisSecondsLeft] = useState<number>(0);
    const [submittingCheckout, setSubmittingCheckout] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [conflicts, setConflicts] = useState<ConflictEntry[]>([]);

    const [confirmationSecondsLeft, setConfirmationSecondsLeft] =
        useState<number>(settings.confirmation_reset_seconds);
    const [confirmationStatus, setConfirmationStatus] = useState<
        'paid' | 'pending_cashier'
    >('paid');

    const [idleSeconds, setIdleSeconds] = useState(0);
    const [pinExitOpen, setPinExitOpen] = useState(false);

    const tapCountRef = useRef(0);
    const tapWindowTimerRef = useRef<number | null>(null);
    const longPressTimerRef = useRef<number | null>(null);

    const resetAllState = useCallback(() => {
        resetSession();
        setActiveOrder(null);
        setActivePayment(null);
        setConflicts([]);
        setCheckoutError(null);
        setIdleSeconds(0);
    }, [resetSession]);

    const handleUserActivity = useCallback(() => {
        setIdleSeconds(0);
    }, []);

    // Block Ctrl+wheel and zoom keyboard shortcuts in Kiosk mode
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                (e.ctrlKey || e.metaKey) &&
                ['+', '-', '=', '0'].includes(e.key)
            ) {
                e.preventDefault();
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Idle timeout tracker (60s total, warning at 50s)
    useEffect(() => {
        if (step === 'welcome' || step === 'confirmation') {
            return;
        }

        const interval = window.setInterval(() => {
            setIdleSeconds((prev) => {
                const next = prev + 1;
                if (next >= settings.idle_timeout_seconds) {
                    resetAllState();
                    return 0;
                }
                return next;
            });
        }, 1000);

        return () => window.clearInterval(interval);
    }, [step, settings.idle_timeout_seconds, resetAllState]);

    // QRIS countdown timer
    useEffect(() => {
        if (step !== 'payment' || !activePayment?.expires_at) {
            return;
        }

        const updateTimer = () => {
            const diff = Math.max(
                0,
                Math.floor(
                    (new Date(activePayment.expires_at!).getTime() -
                        Date.now()) /
                        1000,
                ),
            );
            setQrisSecondsLeft(diff);
        };

        updateTimer();
        const timer = window.setInterval(updateTimer, 1000);
        return () => window.clearInterval(timer);
    }, [step, activePayment]);

    // Auto-reset after 8 seconds on Confirmation screen
    useEffect(() => {
        if (step !== 'confirmation') {
            return;
        }

        setConfirmationSecondsLeft(settings.confirmation_reset_seconds);
        const timer = window.setInterval(() => {
            setConfirmationSecondsLeft((prev) => {
                if (prev <= 1) {
                    resetAllState();
                    return settings.confirmation_reset_seconds;
                }
                return prev - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [step, settings.confirmation_reset_seconds, resetAllState]);

    // Poll menu availability every 5 seconds
    const refreshAvailability = useCallback(async () => {
        try {
            const res = await jsonRequest<{
                availability: Record<
                    number,
                    {
                        is_available: boolean;
                        reason: string | null;
                        max_servings: number | null;
                    }
                >;
            }>('/kiosk/availability');

            if (!res.ok) {
                return;
            }

            setCategories((prev) =>
                prev.map((cat) => ({
                    ...cat,
                    items: cat.items.map((item) => {
                        const avail = res.data.availability[item.id];
                        if (!avail) {
                            return item;
                        }
                        return {
                            ...item,
                            is_available: avail.is_available,
                            unavailable_reason: avail.reason,
                            max_servings: avail.max_servings,
                        };
                    }),
                })),
            );
        } catch {
            // Silent retry on next poll
        }
    }, []);

    usePolling(refreshAvailability, 5000, step === 'menu' || step === 'cart');

    // Poll QRIS status every 2 seconds
    const pollQrisStatus = useCallback(async () => {
        if (!activeOrder) {
            return;
        }
        try {
            const res = await jsonRequest<{
                order_status: string;
                payment_status: string;
                queue_number: string;
            }>(`/kiosk/orders/${activeOrder.id}/qris-status`);

            if (!res.ok) {
                return;
            }

            if (
                res.data.order_status === 'paid' ||
                res.data.payment_status === 'paid'
            ) {
                clearCart();
                setConfirmationStatus('paid');
                setStep('confirmation');
                return;
            }

            if (res.data.payment_status === 'expired') {
                setActivePayment((prev) =>
                    prev ? { ...prev, status: 'expired' } : null,
                );
            }
        } catch {
            // Silent retry on next poll
        }
    }, [activeOrder, clearCart, setStep]);

    usePolling(
        pollQrisStatus,
        2000,
        step === 'payment' &&
            activeOrder !== null &&
            activePayment?.status === 'pending',
    );

    const handleLogoPointerDown = () => {
        if (longPressTimerRef.current !== null) {
            window.clearTimeout(longPressTimerRef.current);
        }
        longPressTimerRef.current = window.setTimeout(() => {
            setPinExitOpen(true);
        }, 3000);
    };

    const handleLogoPointerUp = () => {
        if (longPressTimerRef.current !== null) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleLogoTap = () => {
        tapCountRef.current += 1;
        if (tapWindowTimerRef.current !== null) {
            window.clearTimeout(tapWindowTimerRef.current);
        }

        if (tapCountRef.current >= 5) {
            tapCountRef.current = 0;
            setPinExitOpen(true);
            return;
        }

        tapWindowTimerRef.current = window.setTimeout(() => {
            tapCountRef.current = 0;
        }, 3000);
    };

    const handleStartOrder = () => {
        handleUserActivity();
        try {
            if (!document.fullscreenElement) {
                void document.documentElement.requestFullscreen?.();
            }
        } catch {
            // Fullscreen optional if blocked by browser policy
        }
        setStep('order_type');
    };

    const totalCartCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalCartAmount = items.reduce(
        (sum, item) =>
            sum + (item.unitPrice + item.modifiersTotal) * item.quantity,
        0,
    );

    const handleCheckout = async (method: 'qris' | 'cashier') => {
        if (!orderType || items.length === 0 || submittingCheckout) {
            return;
        }

        setSubmittingCheckout(true);
        setCheckoutError(null);

        try {
            const res = await jsonRequest<{
                order?: ActiveOrder;
                payment?: ActivePayment | null;
                message?: string;
                conflicts?: ConflictEntry[];
            }>('/kiosk/checkout', {
                method: 'POST',
                body: {
                    order_type: orderType,
                    customer_name: customerName.trim() || null,
                    payment_method: method,
                    items: items.map((item) => ({
                        menu_item_id: item.menuItemId,
                        quantity: item.quantity,
                        notes: item.notes || null,
                        modifier_option_ids: item.selectedModifiers.map(
                            (m) => m.optionId,
                        ),
                    })),
                },
            });

            if (res.status === 409 && res.data.conflicts) {
                setConflicts(res.data.conflicts);
                return;
            }

            if (!res.ok || !res.data.order) {
                setCheckoutError(
                    res.data.message ?? 'Gagal memproses pesanan.',
                );
                return;
            }

            setActiveOrder(res.data.order);

            if (method === 'qris' && res.data.payment) {
                setActivePayment(res.data.payment);
                setStep('payment');
            } else {
                clearCart();
                setConfirmationStatus('pending_cashier');
                setStep('confirmation');
            }
        } catch {
            setCheckoutError('Koneksi bermasalah. Silakan coba lagi.');
        } finally {
            setSubmittingCheckout(false);
        }
    };

    const handleRegenerateQris = async () => {
        if (!activeOrder) {
            return;
        }
        const res = await jsonRequest<{ payment?: ActivePayment }>(
            `/kiosk/orders/${activeOrder.id}/qris-regenerate`,
            { method: 'POST' },
        );
        if (res.ok && res.data.payment) {
            setActivePayment(res.data.payment);
        }
    };

    const handleSimulateQrisPaid = async () => {
        if (!activeOrder) {
            return;
        }
        const res = await jsonRequest<{ order_status?: string }>(
            `/kiosk/orders/${activeOrder.id}/qris-simulate-paid`,
            { method: 'POST' },
        );
        if (res.ok && res.data.order_status === 'paid') {
            clearCart();
            setConfirmationStatus('paid');
            setStep('confirmation');
        }
    };

    const handleFallbackCashier = () => {
        if (!activeOrder) {
            return;
        }
        clearCart();
        setConfirmationStatus('pending_cashier');
        setStep('confirmation');
    };

    const activeCategory =
        categories.find((cat) => cat.id === activeCategoryId) ?? categories[0];

    const showIdleWarning =
        step !== 'welcome' &&
        step !== 'confirmation' &&
        idleSeconds >= settings.idle_warning_seconds;

    return (
        <>
            <Head title={`Kiosk — ${settings.cafe_name}`} />

            <div
                className="min-h-screen w-full touch-manipulation overflow-x-hidden bg-background text-foreground select-none"
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={handleUserActivity}
                onKeyDown={handleUserActivity}
            >
                {step === 'welcome' && (
                    <div className="flex min-h-screen flex-col items-center justify-between bg-espresso px-6 py-12 text-oat">
                        <div className="flex w-full max-w-2xl items-center justify-between text-xs text-latte/70">
                            <span>{device.name}</span>
                            <span>Self-Ordering Kiosk</span>
                        </div>

                        <div className="flex max-w-xl flex-col items-center text-center">
                            <button
                                type="button"
                                onClick={handleLogoTap}
                                onPointerDown={handleLogoPointerDown}
                                onPointerUp={handleLogoPointerUp}
                                onPointerLeave={handleLogoPointerUp}
                                className="mb-8 flex size-28 items-center justify-center rounded-3xl bg-crema text-white shadow-xl"
                                aria-label="Logo Our Coffee"
                            >
                                <Coffee className="size-14" />
                            </button>

                            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                                {settings.cafe_name}
                            </h1>
                            <p className="mt-4 text-lg text-latte/85">
                                Pesan kopi favorit Anda dengan cepat tanpa antre
                                di kasir.
                            </p>

                            <Button
                                type="button"
                                onClick={handleStartOrder}
                                className="mt-10 min-h-20 min-w-72 rounded-2xl bg-crema px-10 text-2xl font-extrabold text-white shadow-lg hover:bg-crema/90"
                            >
                                Mulai Pesan
                            </Button>
                        </div>

                        <p className="text-xs font-medium text-latte/80">
                            Ketuk tombol di atas untuk memulai pesanan Anda
                        </p>
                    </div>
                )}

                {step === 'order_type' && (
                    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-10">
                        <div className="text-center">
                            <h1 className="text-3xl font-extrabold tracking-tight">
                                Mau nikmati di mana?
                            </h1>
                            <p className="mt-2 text-base text-muted-foreground">
                                Pilih tipe pesanan Anda terlebih dahulu
                            </p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setOrderType('dine_in');
                                    setStep('menu');
                                }}
                                className={cn(
                                    'flex min-h-48 flex-col items-center justify-center gap-4 rounded-3xl border-2 bg-card p-8 shadow-sm transition-all hover:border-primary',
                                    orderType === 'dine_in' &&
                                        'border-primary bg-primary/5',
                                )}
                            >
                                <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                                    <Store className="size-9" />
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-extrabold">
                                        Dine-In
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Minum di tempat
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setOrderType('takeaway');
                                    setStep('menu');
                                }}
                                className={cn(
                                    'flex min-h-48 flex-col items-center justify-center gap-4 rounded-3xl border-2 bg-card p-8 shadow-sm transition-all hover:border-primary',
                                    orderType === 'takeaway' &&
                                        'border-primary bg-primary/5',
                                )}
                            >
                                <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                                    <ShoppingBag className="size-9" />
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-extrabold">
                                        Takeaway
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Bawa pulang
                                    </p>
                                </div>
                            </button>
                        </div>

                        <div className="mx-auto w-full max-w-md space-y-2 rounded-2xl border bg-card p-5">
                            <Label htmlFor="kiosk-nickname">
                                Nama Panggilan untuk Antrean (Opsional)
                            </Label>
                            <Input
                                id="kiosk-nickname"
                                value={customerName}
                                onChange={(e) =>
                                    setCustomerName(e.target.value)
                                }
                                maxLength={80}
                                placeholder="Contoh: Rafi"
                                className="h-14 text-base"
                            />
                        </div>

                        <div className="flex justify-center">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetAllState}
                                className="min-h-16 min-w-44 rounded-2xl text-base"
                            >
                                Kembali
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'menu' && (
                    <div className="flex h-screen w-full flex-col overflow-hidden">
                        <header className="flex items-center justify-between border-b bg-card px-5 py-3">
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep('order_type')}
                                    className="min-h-16 min-w-16 rounded-2xl"
                                    aria-label="Ubah tipe pesanan"
                                >
                                    <ArrowLeft className="size-6" />
                                </Button>
                                <div>
                                    <h1 className="text-lg font-extrabold">
                                        {settings.cafe_name}
                                    </h1>
                                    <p className="text-xs text-muted-foreground">
                                        {orderType === 'dine_in'
                                            ? 'Dine-In'
                                            : 'Takeaway'}
                                        {customerName
                                            ? ` · ${customerName}`
                                            : ''}
                                    </p>
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={() => setStep('cart')}
                                className="min-h-16 gap-3 rounded-2xl px-6 text-base font-bold"
                            >
                                <ShoppingBag className="size-5" />
                                <span>Keranjang ({totalCartCount})</span>
                                <span className="font-money">
                                    {formatRupiah(totalCartAmount)}
                                </span>
                            </Button>
                        </header>

                        <div className="flex min-h-0 flex-1 overflow-hidden">
                            <aside
                                aria-label="Kategori Menu"
                                className="flex w-28 shrink-0 flex-col gap-2 overflow-y-auto bg-espresso p-2.5 text-oat sm:w-40"
                            >
                                {categories.map((cat) => {
                                    const active =
                                        cat.id === activeCategory?.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() =>
                                                setActiveCategoryId(cat.id)
                                            }
                                            className={cn(
                                                'flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-center text-xs font-bold transition-colors sm:text-sm',
                                                active
                                                    ? 'bg-crema text-white shadow-sm'
                                                    : 'text-latte/80 hover:bg-white/10',
                                            )}
                                        >
                                            <CategoryIcon icon={cat.icon} />
                                            <span className="line-clamp-2">
                                                {cat.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </aside>

                            <section className="flex-1 overflow-y-auto p-5 pb-28">
                                <h2 className="mb-4 text-xl font-extrabold">
                                    {activeCategory?.name}
                                </h2>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {(activeCategory?.items ?? []).map(
                                        (item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                disabled={!item.is_available}
                                                onClick={() => {
                                                    setEditingCartItem(null);
                                                    setSheetMenu(item);
                                                }}
                                                className={cn(
                                                    'flex flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-xs transition-all',
                                                    item.is_available
                                                        ? 'hover:border-primary hover:shadow-md'
                                                        : 'cursor-not-allowed opacity-55 grayscale',
                                                )}
                                            >
                                                <div className="relative aspect-[4/3] w-full bg-secondary">
                                                    {item.image_url ? (
                                                        <img
                                                            src={item.image_url}
                                                            alt={item.name}
                                                            className="size-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex size-full items-center justify-center text-muted-foreground">
                                                            <Coffee className="size-12 opacity-40" />
                                                        </div>
                                                    )}

                                                    {item.badge ===
                                                        'best_seller' && (
                                                        <Badge className="absolute top-2.5 left-2.5 bg-crema text-white">
                                                            Best Seller
                                                        </Badge>
                                                    )}
                                                    {item.badge === 'new' && (
                                                        <Badge className="absolute top-2.5 left-2.5 bg-espresso text-oat">
                                                            New
                                                        </Badge>
                                                    )}
                                                    {!item.is_available && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                            <span className="rounded-xl bg-red-700 px-4 py-1.5 text-sm font-extrabold tracking-wider text-white">
                                                                HABIS
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-1 flex-col justify-between p-4">
                                                    <div>
                                                        <p className="text-base font-bold">
                                                            {item.name}
                                                        </p>
                                                        {item.description && (
                                                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                                {
                                                                    item.description
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="font-money mt-3 text-base font-extrabold text-primary">
                                                        {formatRupiah(
                                                            item.price,
                                                        )}
                                                    </p>
                                                </div>
                                            </button>
                                        ),
                                    )}
                                </div>
                            </section>
                        </div>

                        {totalCartCount > 0 && (
                            <div className="fixed inset-x-0 bottom-0 border-t bg-card/95 p-4 backdrop-blur-xs">
                                <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Total Keranjang ({totalCartCount}{' '}
                                            item)
                                        </p>
                                        <p className="font-money text-xl font-extrabold text-primary">
                                            {formatRupiah(totalCartAmount)}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => setStep('cart')}
                                        className="min-h-16 min-w-48 rounded-2xl px-8 text-lg font-extrabold"
                                    >
                                        Lihat Keranjang
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 'cart' && (
                    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-8">
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep('menu')}
                                className="min-h-16 min-w-16 rounded-2xl"
                                aria-label="Kembali ke menu"
                            >
                                <ArrowLeft className="size-6" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-extrabold">
                                    Review Keranjang
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {orderType === 'dine_in'
                                        ? 'Dine-In'
                                        : 'Takeaway'}
                                    {customerName ? ` · ${customerName}` : ''}
                                </p>
                            </div>
                        </div>

                        {checkoutError && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                                {checkoutError}
                            </div>
                        )}

                        {items.length === 0 ? (
                            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border bg-card p-10 text-center">
                                <ShoppingBag className="size-12 text-muted-foreground/50" />
                                <p className="mt-3 text-lg font-bold">
                                    Keranjang masih kosong
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => setStep('menu')}
                                    className="mt-6 min-h-16 rounded-2xl px-8 text-base font-bold"
                                >
                                    Pilih Menu
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    {items.map((item) => {
                                        const menuObj = categories
                                            .flatMap((c) => c.items)
                                            .find(
                                                (m) => m.id === item.menuItemId,
                                            );
                                        return (
                                            <div
                                                key={item.lineId}
                                                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-xs"
                                            >
                                                <div className="min-w-48 flex-1">
                                                    <p className="text-base font-bold">
                                                        {item.name}
                                                    </p>
                                                    {item.selectedModifiers
                                                        .length > 0 && (
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {item.selectedModifiers
                                                                .map(
                                                                    (m) =>
                                                                        m.optionName,
                                                                )
                                                                .join(', ')}
                                                        </p>
                                                    )}
                                                    {item.notes && (
                                                        <p className="mt-1 text-xs font-medium text-primary">
                                                            Catatan:{' '}
                                                            {item.notes}
                                                        </p>
                                                    )}
                                                    <p className="font-money mt-2 text-sm font-bold text-primary">
                                                        {formatRupiah(
                                                            (item.unitPrice +
                                                                item.modifiersTotal) *
                                                                item.quantity,
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {menuObj && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setEditingCartItem(
                                                                    item,
                                                                );
                                                                setSheetMenu(
                                                                    menuObj,
                                                                );
                                                            }}
                                                            className="min-h-16 min-w-16 rounded-xl"
                                                            aria-label="Edit kustomisasi"
                                                        >
                                                            <Edit2 className="size-5" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.lineId,
                                                                -1,
                                                            )
                                                        }
                                                        className="min-h-16 min-w-16 rounded-xl"
                                                        aria-label="Kurangi"
                                                    >
                                                        <Minus className="size-5" />
                                                    </Button>
                                                    <span className="font-money min-w-8 text-center text-lg font-bold">
                                                        {item.quantity}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.lineId,
                                                                1,
                                                            )
                                                        }
                                                        className="min-h-16 min-w-16 rounded-xl"
                                                        aria-label="Tambah"
                                                    >
                                                        <Plus className="size-5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() =>
                                                            removeItem(
                                                                item.lineId,
                                                            )
                                                        }
                                                        className="min-h-16 min-w-16 rounded-xl"
                                                        aria-label="Hapus item"
                                                    >
                                                        <Trash2 className="size-5 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-auto space-y-4 rounded-3xl border bg-card p-6 shadow-xs">
                                    <div className="flex items-center justify-between text-lg font-bold">
                                        <span>Total Pembayaran</span>
                                        <span className="font-money text-2xl text-primary">
                                            {formatRupiah(totalCartAmount)}
                                        </span>
                                    </div>

                                    <div className="grid gap-3">
                                        <Button
                                            type="button"
                                            disabled={submittingCheckout}
                                            onClick={() =>
                                                void handleCheckout('cashier')
                                            }
                                            className="min-h-16 gap-2 rounded-2xl text-base font-extrabold"
                                        >
                                            <Banknote className="size-5" />
                                            Bayar Tunai di Kasir
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {step === 'payment' && activeOrder && activePayment && (
                    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-10 text-center">
                        <div className="w-full rounded-3xl border bg-card p-8 shadow-sm">
                            <p className="text-sm font-semibold text-muted-foreground">
                                Scan QRIS untuk Melunasi Pesanan
                            </p>
                            <p className="font-money mt-1 text-3xl font-extrabold text-primary">
                                {formatRupiah(activeOrder.total_amount)}
                            </p>
                            <p className="font-money mt-1 text-xs text-muted-foreground">
                                Antrean #{activeOrder.queue_number} ·{' '}
                                {activeOrder.order_number}
                            </p>

                            <div className="my-6 flex justify-center">
                                {activePayment.qris_payload && (
                                    <QrMatrixSvg
                                        payload={activePayment.qris_payload}
                                    />
                                )}
                            </div>

                            {activePayment.status === 'expired' ||
                            qrisSecondsLeft === 0 ? (
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-red-700">
                                        Kode QRIS sudah kedaluwarsa.
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            void handleRegenerateQris()
                                        }
                                        className="min-h-16 w-full gap-2 rounded-2xl text-base font-bold"
                                    >
                                        <RefreshCw className="size-5" />
                                        Buat QR Baru
                                    </Button>
                                </div>
                            ) : (
                                <p className="font-money text-sm font-semibold text-muted-foreground">
                                    Berlaku selama{' '}
                                    {Math.floor(qrisSecondsLeft / 60)}:
                                    {String(qrisSecondsLeft % 60).padStart(
                                        2,
                                        '0',
                                    )}
                                </p>
                            )}

                            <div className="mt-6 space-y-3">
                                {isLocalDemo &&
                                    activePayment.status === 'pending' && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                void handleSimulateQrisPaid()
                                            }
                                            className="min-h-16 w-full rounded-2xl border-emerald-600 text-base font-bold text-emerald-800 hover:bg-emerald-50"
                                        >
                                            Simulasikan QRIS Lunas (Demo)
                                        </Button>
                                    )}

                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleFallbackCashier}
                                    className="min-h-16 w-full rounded-2xl text-base font-bold"
                                >
                                    Bayar di Kasir Saja
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'confirmation' && activeOrder && (
                    <div className="flex min-h-screen flex-col items-center justify-center bg-espresso px-6 py-12 text-center text-oat">
                        <div className="max-w-lg rounded-3xl border border-white/15 bg-white/5 p-10">
                            <CheckCircle2 className="mx-auto size-16 text-emerald-400" />
                            <h1 className="mt-4 text-3xl font-extrabold">
                                {confirmationStatus === 'paid'
                                    ? 'Pembayaran Berhasil!'
                                    : 'Silakan Bayar di Kasir'}
                            </h1>
                            <p className="mt-2 text-base text-latte/85">
                                {confirmationStatus === 'paid'
                                    ? 'Pesanan Anda langsung diproses oleh Barista kami.'
                                    : 'Tunjukkan nomor antrean di bawah ini ke meja kasir untuk pelunasan.'}
                            </p>

                            <div className="my-8 rounded-2xl bg-crema px-6 py-6 text-white">
                                <p className="text-xs font-semibold tracking-widest text-white/80 uppercase">
                                    Nomor Antrean
                                </p>
                                <p className="font-money mt-1 text-6xl font-extrabold">
                                    #{activeOrder.queue_number}
                                </p>
                            </div>

                            <p className="font-money text-sm text-latte/75">
                                Layar akan kembali ke halaman utama dalam{' '}
                                {confirmationSecondsLeft} detik...
                            </p>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={resetAllState}
                                className="mt-6 min-h-16 min-w-48 rounded-2xl text-base font-bold"
                            >
                                Pesan Baru
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <ModifierSheet
                menuItem={sheetMenu}
                editingCartItem={editingCartItem}
                open={sheetMenu !== null}
                onClose={() => {
                    setSheetMenu(null);
                    setEditingCartItem(null);
                }}
                onConfirm={(item) => addOrUpdateItem(item)}
            />

            <Dialog
                open={conflicts.length > 0}
                onOpenChange={(open) => {
                    if (!open) {
                        setConflicts([]);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="size-5" />
                            Stok Item Baru Saja Habis
                        </DialogTitle>
                        <DialogDescription>
                            Item berikut tidak dapat diproses karena stok bahan
                            baku baru saja habis:
                        </DialogDescription>
                    </DialogHeader>
                    <ul className="space-y-2 text-sm">
                        {conflicts.map((c, idx) => (
                            <li
                                key={`${c.menu_item_id}-${idx}`}
                                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2"
                            >
                                <p className="font-bold text-red-900">
                                    {c.menu_item_name}
                                </p>
                                <p className="text-xs text-red-800">
                                    {c.reason}
                                </p>
                            </li>
                        ))}
                    </ul>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConflicts([])}
                            className="min-h-14"
                        >
                            Kembali
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                removeItemsByMenuIds(
                                    conflicts.map((c) => c.menu_item_id),
                                );
                                setConflicts([]);
                                void refreshAvailability();
                            }}
                            className="min-h-14 font-bold"
                        >
                            Hapus Item Habis & Lanjutkan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showIdleWarning}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Apakah Anda Masih di Sini?</DialogTitle>
                        <DialogDescription>
                            Sesi pemesanan akan otomatis direset dalam{' '}
                            <span className="font-money font-bold">
                                {Math.max(
                                    0,
                                    settings.idle_timeout_seconds - idleSeconds,
                                )}
                            </span>{' '}
                            detik.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={resetAllState}
                            className="min-h-14"
                        >
                            Mulai Ulang
                        </Button>
                        <Button
                            type="button"
                            onClick={handleUserActivity}
                            className="min-h-14 font-bold"
                        >
                            Lanjutkan Pesanan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <PinExitModal
                open={pinExitOpen}
                onClose={() => setPinExitOpen(false)}
            />
        </>
    );
}
