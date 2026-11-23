import { Head } from '@inertiajs/react';
import { Coffee } from 'lucide-react';
import { useCallback, useState } from 'react';
import { usePolling } from '@/hooks/use-polling';
import { jsonRequest } from '@/lib/http';

type QueueTicket = {
    id: number;
    queue_number: string;
    customer_name: string | null;
    order_type: string;
};

type QueueDisplayProps = {
    cafeName: string;
    preparing: QueueTicket[];
    ready: QueueTicket[];
};

export default function QueueDisplayPage({
    cafeName,
    preparing: initialPreparing,
    ready: initialReady,
}: QueueDisplayProps) {
    const [preparing, setPreparing] = useState<QueueTicket[]>(initialPreparing);
    const [ready, setReady] = useState<QueueTicket[]>(initialReady);

    const refreshFeed = useCallback(async () => {
        try {
            const res = await jsonRequest<{
                preparing: QueueTicket[];
                ready: QueueTicket[];
            }>('/display/queue/feed');
            if (res.ok) {
                setPreparing(res.data.preparing);
                setReady(res.data.ready);
            }
        } catch {
            // Silent retry on next poll
        }
    }, []);

    usePolling(refreshFeed, 3000, true);

    return (
        <>
            <Head title={`Antrean — ${cafeName}`} />
            <div className="flex min-h-screen flex-col bg-espresso p-6 text-oat">
                <header className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-crema text-white">
                            <Coffee className="size-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight">
                                {cafeName}
                            </h1>
                            <p className="text-xs text-latte/75">
                                Status Antrean Pesanan Real-Time
                            </p>
                        </div>
                    </div>
                </header>

                <div className="grid flex-1 gap-6 md:grid-cols-2">
                    <section className="flex flex-col rounded-3xl border border-white/15 bg-white/5 p-6">
                        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
                            <h2 className="text-xl font-extrabold tracking-wide text-latte">
                                Sedang Disiapkan
                            </h2>
                            <span className="font-money rounded-full bg-white/10 px-3 py-1 text-sm font-bold">
                                {preparing.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {preparing.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center"
                                >
                                    <p className="font-money text-3xl font-extrabold">
                                        #{item.queue_number}
                                    </p>
                                    {item.customer_name && (
                                        <p className="mt-1 truncate text-xs text-latte/80">
                                            {item.customer_name}
                                        </p>
                                    )}
                                </div>
                            ))}
                            {preparing.length === 0 && (
                                <p className="col-span-full py-12 text-center text-sm text-latte/50">
                                    Belum ada pesanan yang sedang disiapkan.
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="flex flex-col rounded-3xl border-2 border-emerald-500/60 bg-emerald-950/35 p-6">
                        <div className="mb-5 flex items-center justify-between border-b border-emerald-400/20 pb-3">
                            <h2 className="text-xl font-extrabold tracking-wide text-emerald-300">
                                Siap Diambil
                            </h2>
                            <span className="font-money rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-bold text-emerald-200">
                                {ready.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {ready.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-2xl bg-emerald-500 p-4 text-center text-espresso shadow-md"
                                >
                                    <p className="font-money text-4xl font-extrabold">
                                        #{item.queue_number}
                                    </p>
                                    {item.customer_name && (
                                        <p className="mt-1 truncate text-xs font-bold">
                                            {item.customer_name}
                                        </p>
                                    )}
                                </div>
                            ))}
                            {ready.length === 0 && (
                                <p className="col-span-full py-12 text-center text-sm text-emerald-200/50">
                                    Belum ada pesanan siap diambil.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
