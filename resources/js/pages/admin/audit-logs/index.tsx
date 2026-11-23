import { Head, router } from '@inertiajs/react';
import { Filter } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateWib, formatTimeWib } from '@/lib/format';

type AuditLogRow = {
    id: number;
    action: string;
    actor_name: string | null;
    authorizer_name: string | null;
    auditable_type: string | null;
    auditable_id: number | null;
    reason: string | null;
    metadata: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string | null;
};

type Props = {
    logs: AuditLogRow[];
    actions: string[];
    staffList: Array<{ id: number; name: string }>;
    filters: {
        action: string;
        actor_id: number | null;
        start_date: string;
        end_date: string;
    };
};

export default function AdminAuditLogsIndex({
    logs,
    actions,
    staffList,
    filters,
}: Props) {
    const [action, setAction] = useState(filters.action);
    const [actorId, setActorId] = useState(
        filters.actor_id ? String(filters.actor_id) : '',
    );
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);

    const applyFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/audit-logs',
            {
                action: action || undefined,
                actor_id: actorId || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            },
            { preserveState: true },
        );
    };

    return (
        <>
            <Head title="Audit Log" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Audit Log Aktivitas Kritis
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Jejak baca-saja untuk void pesanan, diskon manual, stock
                        opname, waste, selisih shift, dan perubahan otorisasi.
                    </p>
                </div>

                <form
                    onSubmit={applyFilter}
                    className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-xs"
                >
                    <div className="space-y-1">
                        <Label htmlFor="aud-action">Aksi</Label>
                        <select
                            id="aud-action"
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="">Semua Aksi</option>
                            {actions.map((act) => (
                                <option key={act} value={act}>
                                    {act}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="aud-actor">Staf / Otorisator</Label>
                        <select
                            id="aud-actor"
                            value={actorId}
                            onChange={(e) => setActorId(e.target.value)}
                            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="">Semua Staf</option>
                            {staffList.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="aud-start">Dari</Label>
                        <Input
                            id="aud-start"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="aud-end">Sampai</Label>
                        <Input
                            id="aud-end"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <Button type="submit" variant="outline" className="gap-2">
                        <Filter className="size-4" />
                        Filter
                    </Button>
                </form>

                <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3">Waktu (WIB)</th>
                                <th className="px-4 py-3">Aksi</th>
                                <th className="px-4 py-3">Pelaku</th>
                                <th className="px-4 py-3">Otorisasi PIN</th>
                                <th className="px-4 py-3">Alasan & Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td className="font-money px-4 py-3 text-xs text-muted-foreground">
                                        {log.created_at
                                            ? `${formatDateWib(log.created_at)} ${formatTimeWib(log.created_at)}`
                                            : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline">
                                            {log.action}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.actor_name ?? 'Sistem'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.authorizer_name ?? '-'}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        <p className="font-medium">
                                            {log.reason ?? '-'}
                                        </p>
                                        {log.metadata && (
                                            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                                                {JSON.stringify(log.metadata)}
                                            </p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        Belum ada catatan audit log yang cocok.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
