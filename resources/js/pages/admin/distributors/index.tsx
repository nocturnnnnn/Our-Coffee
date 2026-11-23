import { Head, router, useForm } from '@inertiajs/react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type DistributorItem = {
    id: number;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    is_active: boolean;
    ingredients_count: number;
};

export default function AdminDistributorsIndex({
    distributors,
}: {
    distributors: DistributorItem[];
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<DistributorItem | null>(null);

    const form = useForm({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        is_active: true,
    });

    const openCreate = () => {
        setEditing(null);
        form.setData({
            name: '',
            contact_person: '',
            phone: '',
            email: '',
            address: '',
            notes: '',
            is_active: true,
        });
        setDialogOpen(true);
    };

    const openEdit = (dist: DistributorItem) => {
        setEditing(dist);
        form.setData({
            name: dist.name,
            contact_person: dist.contact_person ?? '',
            phone: dist.phone ?? '',
            email: dist.email ?? '',
            address: dist.address ?? '',
            notes: dist.notes ?? '',
            is_active: dist.is_active,
        });
        setDialogOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editing) {
            form.put(`/admin/distributors/${editing.id}`, {
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            form.post('/admin/distributors', {
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    return (
        <>
            <Head title="Distributor" />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Master Distributor
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola pemasok biji kopi, susu, sirup, dan pastry
                            untuk pencatatan Stock In.
                        </p>
                    </div>
                    <Button onClick={openCreate} className="min-h-11 gap-2">
                        <Plus className="size-4" />
                        Tambah Distributor
                    </Button>
                </div>

                <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3">Nama Pemasok</th>
                                <th className="px-4 py-3">Kontak PIC</th>
                                <th className="px-4 py-3">Telepon / Email</th>
                                <th className="px-4 py-3">Bahan Terkait</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {distributors.map((dist) => (
                                <tr key={dist.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold">
                                            {dist.name}
                                        </p>
                                        {dist.address && (
                                            <p className="text-xs text-muted-foreground">
                                                {dist.address}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {dist.contact_person ?? '-'}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        <p>{dist.phone ?? '-'}</p>
                                        <p className="text-muted-foreground">
                                            {dist.email ?? ''}
                                        </p>
                                    </td>
                                    <td className="font-money px-4 py-3">
                                        {dist.ingredients_count} bahan
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={
                                                dist.is_active
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {dist.is_active
                                                ? 'Aktif'
                                                : 'Nonaktif'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEdit(dist)}
                                            >
                                                <Edit2 className="size-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            `Hapus distributor "${dist.name}"?`,
                                                        )
                                                    ) {
                                                        router.delete(
                                                            `/admin/distributors/${dist.id}`,
                                                        );
                                                    }
                                                }}
                                            >
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editing
                                ? 'Edit Distributor'
                                : 'Tambah Distributor'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="dist-name">Nama Distributor</Label>
                            <Input
                                id="dist-name"
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="dist-pic">Nama PIC</Label>
                                <Input
                                    id="dist-pic"
                                    value={form.data.contact_person}
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_person',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="dist-phone">Telepon</Label>
                                <Input
                                    id="dist-phone"
                                    value={form.data.phone}
                                    onChange={(e) =>
                                        form.setData('phone', e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="dist-email">Email</Label>
                            <Input
                                id="dist-email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData('email', e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="dist-address">Alamat</Label>
                            <textarea
                                id="dist-address"
                                rows={2}
                                value={form.data.address}
                                onChange={(e) =>
                                    form.setData('address', e.target.value)
                                }
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(e) =>
                                    form.setData('is_active', e.target.checked)
                                }
                            />
                            Distributor Aktif
                        </label>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
