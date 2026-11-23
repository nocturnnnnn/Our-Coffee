import { Head } from '@inertiajs/react';
import { CheckCircle2, ChefHat, Clock, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePolling } from '@/hooks/use-polling';
import { jsonRequest } from '@/lib/http';
import { cn } from '@/lib/utils';

type TicketModifier = {
    group_name: string;
    option_name: string;
    is_default: boolean;
};

type TicketItem = {
    id: number;
    menu_item_name: string;
    quantity: number;
    notes: string | null;
    modifiers: TicketModifier[];
};

type KdsStatus = 'paid' | 'preparing' | 'ready' | 'completed';

type KdsTicket = {
    id: number;
    order_number: string;
    queue_number: string;
    channel: string;
    order_type: string;
    customer_name: string | null;
    status: KdsStatus;
    paid_at: string | null;
    preparing_at: string | null;
    ready_at: string | null;
    items: TicketItem[];
};

function playChime() {
    try {
        const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;
        if (!AudioCtx) {
            return;
        }
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const playTone = (freq: number, start: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.15, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + duration);
        };

        playTone(659.25, now, 0.16);
        playTone(880, now + 0.14, 0.28);
    } catch {
        // Ignore if audio context blocked before interaction
    }
}

function formatElapsed(
    paidAt: string | null,
    nowMs: number,
): {
    label: string;
    tier: 'green' | 'amber' | 'red';
} {
    if (!paidAt) {
        return { label: '00:00', tier: 'green' };
    }
    const elapsedSec = Math.max(
        0,
        Math.floor((nowMs - new Date(paidAt).getTime()) / 1000),
    );
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    const label = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (mins >= 10) {
        return { label, tier: 'red' };
    }
    if (mins >= 5) {
        return { label, tier: 'amber' };
    }
    return { label, tier: 'green' };
}

export default function KdsIndexPage({
    tickets: initialTickets,
}: {
    tickets: KdsTicket[];
}) {
    const [tickets, setTickets] = useState<KdsTicket[]>(initialTickets);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [muted, setMuted] = useState(false);

    const knownPaidIdsRef = useRef<Set<number>>(
        new Set(
            initialTickets.filter((t) => t.status === 'paid').map((t) => t.id),
        ),
    );

    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const refreshTickets = useCallback(async () => {
        try {
            const res = await jsonRequest<{ tickets: KdsTicket[] }>(
                '/kds/tickets',
            );
            if (!res.ok) {
                return;
            }

            const incomingPaid = res.data.tickets.filter(
                (t) => t.status === 'paid',
            );
            const hasNewPaid = incomingPaid.some(
                (t) => !knownPaidIdsRef.current.has(t.id),
            );

            knownPaidIdsRef.current = new Set(incomingPaid.map((t) => t.id));

            if (hasNewPaid && !muted) {
                playChime();
            }

            setTickets(res.data.tickets);
        } catch {
            // Silent retry on next poll
        }
    }, [muted]);

    usePolling(refreshTickets, 3000, true);

    const sendTransition = async (
        ticketId: number,
        targetStatus: KdsStatus,
    ) => {
        const res = await jsonRequest<{ ticket?: KdsTicket }>(
            `/kds/orders/${ticketId}/status`,
            {
                method: 'PATCH',
                body: { status: targetStatus },
            },
        );
        if (res.ok) {
            await refreshTickets();
        }
    };

    const handleAdvance = (ticket: KdsTicket, nextStatus: KdsStatus) => {
        const previousStatus = ticket.status;
        const previousSnapshot = ticket;

        // Optimistic update
        if (nextStatus === 'completed') {
            setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
        } else {
            setTickets((prev) =>
                prev.map((t) =>
                    t.id === ticket.id ? { ...t, status: nextStatus } : t,
                ),
            );
        }

        void sendTransition(ticket.id, nextStatus);

        const nextLabel =
            nextStatus === 'preparing'
                ? 'Sedang Disiapkan'
                : nextStatus === 'ready'
                  ? 'Siap Diambil'
                  : 'Selesai';

        toast.success(`#${ticket.queue_number} → ${nextLabel}`, {
            duration: 5000,
            action: {
                label: 'Undo',
                onClick: () => {
                    setTickets((prev) => {
                        const exists = prev.some((t) => t.id === ticket.id);
                        if (!exists) {
                            return [...prev, previousSnapshot];
                        }
                        return prev.map((t) =>
                            t.id === ticket.id
                                ? { ...t, status: previousStatus }
                                : t,
                        );
                    });
                    void sendTransition(ticket.id, previousStatus);
                },
            },
        });
    };

    const paidTickets = tickets.filter((t) => t.status === 'paid');
    const preparingTickets = tickets.filter((t) => t.status === 'preparing');
    const readyTickets = tickets.filter((t) => t.status === 'ready');

    const columns: Array<{
        key: string;
        title: string;
        items: KdsTicket[];
        nextStatus: KdsStatus;
        actionLabel: string;
        buttonClass: string;
    }> = [
        {
            key: 'paid',
            title: 'Baru Masuk (Paid)',
            items: paidTickets,
            nextStatus: 'preparing',
            actionLabel: 'Proses',
            buttonClass: 'bg-crema text-white hover:bg-crema/90',
        },
        {
            key: 'preparing',
            title: 'Sedang Disiapkan',
            items: preparingTickets,
            nextStatus: 'ready',
            actionLabel: 'Tandai Siap',
            buttonClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
        },
        {
            key: 'ready',
            title: 'Siap Diambil',
            items: readyTickets,
            nextStatus: 'completed',
            actionLabel: 'Selesai',
            buttonClass: 'bg-espresso text-oat hover:bg-espresso/90',
        },
    ];

    return (
        <>
            <Head title="Kitchen Display System" />
            <div className="flex h-[calc(100vh-3rem)] flex-col gap-4 overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card px-5 py-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <ChefHat className="size-6 text-primary" />
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight">
                                Kitchen Display System (KDS)
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                Antrean FIFO terurut berdasarkan waktu lunas
                            </p>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMuted((m) => !m)}
                        className="min-h-[52px] gap-2 rounded-xl px-4 font-semibold"
                    >
                        {muted ? (
                            <>
                                <VolumeX className="size-5 text-muted-foreground" />
                                Suara Nonaktif
                            </>
                        ) : (
                            <>
                                <Volume2 className="size-5 text-primary" />
                                Notifikasi Suara Aktif
                            </>
                        )}
                    </Button>
                </header>

                <div className="grid min-h-0 flex-1 grid-cols-3 gap-4 overflow-hidden">
                    {columns.map((col) => (
                        <section
                            key={col.key}
                            className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-muted/40"
                        >
                            <div className="flex items-center justify-between border-b bg-card px-4 py-3">
                                <h2 className="text-sm font-extrabold tracking-wide uppercase">
                                    {col.title}
                                </h2>
                                <Badge
                                    variant="secondary"
                                    className="font-money"
                                >
                                    {col.items.length}
                                </Badge>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto p-3">
                                {col.items.length === 0 && (
                                    <p className="py-12 text-center text-xs text-muted-foreground">
                                        Tidak ada pesanan pada tahap ini.
                                    </p>
                                )}

                                {col.items.map((ticket) => {
                                    const sla = formatElapsed(
                                        ticket.paid_at,
                                        nowMs,
                                    );
                                    return (
                                        <div
                                            key={ticket.id}
                                            className={cn(
                                                'flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs',
                                                sla.tier === 'red' &&
                                                    'border-2 border-red-600',
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-money text-2xl font-extrabold text-primary">
                                                            #
                                                            {
                                                                ticket.queue_number
                                                            }
                                                        </span>
                                                        <Badge variant="outline">
                                                            {ticket.order_type ===
                                                            'dine_in'
                                                                ? 'Dine-In'
                                                                : 'Takeaway'}
                                                        </Badge>
                                                    </div>
                                                    {ticket.customer_name && (
                                                        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                                                            {
                                                                ticket.customer_name
                                                            }
                                                        </p>
                                                    )}
                                                </div>

                                                <span
                                                    className={cn(
                                                        'font-money inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                                                        sla.tier === 'green' &&
                                                            'bg-emerald-100 text-emerald-900',
                                                        sla.tier === 'amber' &&
                                                            'bg-amber-100 text-amber-900',
                                                        sla.tier === 'red' &&
                                                            'bg-red-600 text-white',
                                                    )}
                                                >
                                                    <Clock className="size-3.5" />
                                                    {sla.label}
                                                </span>
                                            </div>

                                            <div className="space-y-2.5 border-t pt-2.5">
                                                {ticket.items.map((item) => {
                                                    const nonDefault =
                                                        item.modifiers.filter(
                                                            (m) =>
                                                                !m.is_default,
                                                        );
                                                    const defaults =
                                                        item.modifiers.filter(
                                                            (m) => m.is_default,
                                                        );

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="space-y-1.5"
                                                        >
                                                            <p className="text-sm font-bold">
                                                                <span className="font-money mr-1.5 text-primary">
                                                                    {
                                                                        item.quantity
                                                                    }
                                                                    x
                                                                </span>
                                                                {
                                                                    item.menu_item_name
                                                                }
                                                            </p>

                                                            {nonDefault.length >
                                                                0 && (
                                                                <div className="flex flex-wrap gap-1.5 pl-5">
                                                                    {nonDefault.map(
                                                                        (
                                                                            mod,
                                                                            idx,
                                                                        ) => (
                                                                            <span
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className="rounded-lg bg-espresso px-2 py-0.5 text-xs font-bold text-oat"
                                                                            >
                                                                                {
                                                                                    mod.option_name
                                                                                }
                                                                            </span>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            )}

                                                            {defaults.length >
                                                                0 && (
                                                                <p className="pl-5 text-xs text-muted-foreground">
                                                                    {defaults
                                                                        .map(
                                                                            (
                                                                                m,
                                                                            ) =>
                                                                                m.option_name,
                                                                        )
                                                                        .join(
                                                                            ' · ',
                                                                        )}
                                                                </p>
                                                            )}

                                                            {item.notes && (
                                                                <div className="ml-5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-950">
                                                                    Catatan:{' '}
                                                                    {item.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    handleAdvance(
                                                        ticket,
                                                        col.nextStatus,
                                                    )
                                                }
                                                className={cn(
                                                    'mt-1 min-h-[52px] w-full gap-2 rounded-xl text-base font-extrabold',
                                                    col.buttonClass,
                                                )}
                                            >
                                                <CheckCircle2 className="size-5" />
                                                {col.actionLabel}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </>
    );
}
