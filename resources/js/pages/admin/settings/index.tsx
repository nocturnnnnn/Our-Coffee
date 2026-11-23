import { Head, router, useForm } from '@inertiajs/react';
import {
    Copy,
    ExternalLink,
    Plus,
    Power,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateWib, formatTimeWib } from '@/lib/format';

type KioskDeviceRow = {
    id: number;
    name: string;
    device_token: string;
    pair_url: string;
    is_active: boolean;
    last_seen_at: string | null;
    paired_by_name: string | null;
};

type SettingsProps = {
    settings: {
        cafe_name: string;
        cafe_address: string;
        cafe_phone: string;
        receipt_footer: string;
        kiosk_idle_timeout_seconds: number;
        kiosk_idle_warning_seconds: number;
        kiosk_confirmation_reset_seconds: number;
        qris_expiry_seconds: number;
    };
    devices: KioskDeviceRow[];
};

export default function AdminSettingsIndex({
    settings,
    devices,
}: SettingsProps) {
    const settingsForm = useForm(settings);
    const [newDeviceName, setNewDeviceName] = useState('');

    const saveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        settingsForm.put('/admin/settings');
    };

    const handleAddDevice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeviceName.trim()) {
            return;
        }
        router.post(
            '/admin/settings/kiosk-devices',
            { name: newDeviceName.trim() },
            { onSuccess: () => setNewDeviceName('') },
        );
    };

    const copyPairLink = (url: string) => {
        void navigator.clipboard?.writeText(url);
        toast.success('Tautan pairing Kiosk disalin ke clipboard.');
    };

    return (
        <>
            <Head title="Pengaturan & Pairing Kiosk" />
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Pengaturan Kafe & Pairing Kiosk
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Atur identitas struk thermal, durasi keamanan Kiosk, dan
                        perangkat Kiosk terpasang.
                    </p>
                </div>

                <form
                    onSubmit={saveSettings}
                    className="space-y-5 rounded-2xl border bg-card p-6 shadow-xs"
                >
                    <h2 className="text-base font-bold">
                        Identitas Kafe & Parameter Operasional
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="set-name">Nama Kafe</Label>
                            <Input
                                id="set-name"
                                value={settingsForm.data.cafe_name}
                                onChange={(e) =>
                                    settingsForm.setData(
                                        'cafe_name',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="set-phone">Telepon</Label>
                            <Input
                                id="set-phone"
                                value={settingsForm.data.cafe_phone}
                                onChange={(e) =>
                                    settingsForm.setData(
                                        'cafe_phone',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="set-address">Alamat Struk</Label>
                            <Input
                                id="set-address"
                                value={settingsForm.data.cafe_address}
                                onChange={(e) =>
                                    settingsForm.setData(
                                        'cafe_address',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="set-footer">Footer Struk</Label>
                            <Input
                                id="set-footer"
                                value={settingsForm.data.receipt_footer}
                                onChange={(e) =>
                                    settingsForm.setData(
                                        'receipt_footer',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="set-idle">
                                Idle Timeout (detik)
                            </Label>
                            <Input
                                id="set-idle"
                                type="number"
                                min={30}
                                value={
                                    settingsForm.data.kiosk_idle_timeout_seconds
                                }
                                onChange={(e) =>
                                    settingsForm.setData(
                                        'kiosk_idle_timeout_seconds',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="set-warn">
                                Peringatan Idle (detik)
                            </Label>
                            <Input
                                id="set-warn"
                                type="number"
                                min={10}
                                value={
                                    settingsForm.data.kiosk_idle_warning_seconds
                                }
                                onChange={(e) =>
                                    settingsForm.setData(
                                        'kiosk_idle_warning_seconds',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="set-reset">
                                Reset Konfirmasi (detik)
                            </Label>
                            <Input
                                id="set-reset"
                                type="number"
                                min={3}
                                value={
                                    settingsForm.data
                                        .kiosk_confirmation_reset_seconds
                                }
                                onChange={(e) =>
                                    settingsForm.setData(
                                        'kiosk_confirmation_reset_seconds',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="set-qris">
                                Masa Berlaku QRIS (detik)
                            </Label>
                            <Input
                                id="set-qris"
                                type="number"
                                min={60}
                                value={settingsForm.data.qris_expiry_seconds}
                                onChange={(e) =>
                                    settingsForm.setData(
                                        'qris_expiry_seconds',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={settingsForm.processing}
                        className="min-h-11 font-bold"
                    >
                        Simpan Pengaturan
                    </Button>
                </form>

                <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold">
                                Perangkat Self-Ordering Kiosk
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Buka tautan pairing pada tablet/layar Kiosk
                                untuk menanamkan token perangkat.
                            </p>
                        </div>

                        <form
                            onSubmit={handleAddDevice}
                            className="flex items-center gap-2"
                        >
                            <Input
                                value={newDeviceName}
                                onChange={(e) =>
                                    setNewDeviceName(e.target.value)
                                }
                                placeholder="Nama perangkat (mis. Kiosk 2)"
                                className="w-56"
                            />
                            <Button type="submit" className="gap-1.5">
                                <Plus className="size-4" />
                                Tambah Kiosk
                            </Button>
                        </form>
                    </div>

                    <div className="space-y-3">
                        {devices.map((dev) => (
                            <div
                                key={dev.id}
                                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold">{dev.name}</p>
                                        <Badge
                                            variant={
                                                dev.is_active
                                                    ? 'default'
                                                    : 'destructive'
                                            }
                                        >
                                            {dev.is_active
                                                ? 'Aktif'
                                                : 'Nonaktif'}
                                        </Badge>
                                    </div>
                                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                                        Token: {dev.device_token}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Terakhir aktif:{' '}
                                        {dev.last_seen_at
                                            ? `${formatDateWib(dev.last_seen_at)} ${formatTimeWib(dev.last_seen_at)} WIB`
                                            : 'Belum pernah terhubung'}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            copyPairLink(dev.pair_url)
                                        }
                                        className="gap-1.5"
                                    >
                                        <Copy className="size-3.5" />
                                        Salin Link Pair
                                    </Button>
                                    <a
                                        href={dev.pair_url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5"
                                        >
                                            <ExternalLink className="size-3.5" />
                                            Buka Kiosk
                                        </Button>
                                    </a>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            router.patch(
                                                `/admin/settings/kiosk-devices/${dev.id}/toggle`,
                                            )
                                        }
                                        title="Aktif / Nonaktifkan"
                                    >
                                        <Power className="size-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            router.post(
                                                `/admin/settings/kiosk-devices/${dev.id}/rotate-token`,
                                            )
                                        }
                                        title="Rotasi Token"
                                    >
                                        <RefreshCw className="size-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    `Hapus perangkat "${dev.name}"?`,
                                                )
                                            ) {
                                                router.delete(
                                                    `/admin/settings/kiosk-devices/${dev.id}`,
                                                );
                                            }
                                        }}
                                    >
                                        <Trash2 className="size-3.5 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
