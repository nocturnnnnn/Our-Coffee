import { Head, useForm } from '@inertiajs/react';
import { Edit2, KeyRound, UserPlus } from 'lucide-react';
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
import type { UserRole } from '@/types/auth';

type StaffMember = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    role_label: string;
    is_active: boolean;
    has_pin: boolean;
    created_at: string | null;
};

export default function AdminStaffIndex({ staff }: { staff: StaffMember[] }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<StaffMember | null>(null);

    const form = useForm({
        name: '',
        email: '',
        password: '',
        role: 'kasir' as UserRole,
        pin: '',
        is_active: true,
    });

    const [pinTarget, setPinTarget] = useState<StaffMember | null>(null);
    const pinForm = useForm({
        pin: '',
    });

    const openCreate = () => {
        setEditing(null);
        form.setData({
            name: '',
            email: '',
            password: '',
            role: 'kasir',
            pin: '',
            is_active: true,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEdit = (member: StaffMember) => {
        setEditing(member);
        form.setData({
            name: member.name,
            email: member.email,
            password: '',
            role: member.role,
            pin: '',
            is_active: member.is_active,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const submitStaff = (e: React.FormEvent) => {
        e.preventDefault();
        if (editing) {
            form.put(`/admin/staff/${editing.id}`, {
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            form.post('/admin/staff', {
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    const submitPin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pinTarget) {
            return;
        }
        pinForm.patch(`/admin/staff/${pinTarget.id}/pin`, {
            onSuccess: () => setPinTarget(null),
        });
    };

    return (
        <>
            <Head title="Karyawan & PIN" />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Manajemen Karyawan & PIN
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola akun staf (Admin, Kasir, Barista) serta PIN
                            otorisasi 6-digit.
                        </p>
                    </div>
                    <Button onClick={openCreate} className="min-h-11 gap-2">
                        <UserPlus className="size-4" />
                        Tambah Staf
                    </Button>
                </div>

                <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3">Nama</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">PIN Otorisasi</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {staff.map((member) => (
                                <tr key={member.id}>
                                    <td className="px-4 py-3 font-semibold">
                                        {member.name}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {member.email}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline">
                                            {member.role_label}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={
                                                member.has_pin
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {member.has_pin
                                                ? 'PIN Terpasang'
                                                : 'Belum Ada PIN'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={
                                                member.is_active
                                                    ? 'default'
                                                    : 'destructive'
                                            }
                                        >
                                            {member.is_active
                                                ? 'Aktif'
                                                : 'Nonaktif'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setPinTarget(member);
                                                    pinForm.setData('pin', '');
                                                    pinForm.clearErrors();
                                                }}
                                                className="gap-1.5"
                                            >
                                                <KeyRound className="size-3.5" />
                                                Atur PIN
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEdit(member)}
                                            >
                                                <Edit2 className="size-4" />
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
                            {editing ? 'Edit Akun Staf' : 'Tambah Staf Baru'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitStaff} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="st-name">Nama Lengkap</Label>
                            <Input
                                id="st-name"
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="st-email">Email Login</Label>
                            <Input
                                id="st-email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData('email', e.target.value)
                                }
                                required
                            />
                            {form.errors.email && (
                                <p className="text-xs text-destructive">
                                    {form.errors.email}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="st-role">Role</Label>
                                <select
                                    id="st-role"
                                    value={form.data.role}
                                    onChange={(e) =>
                                        form.setData(
                                            'role',
                                            e.target.value as UserRole,
                                        )
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="kasir">Kasir</option>
                                    <option value="barista">Barista</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="st-pass">
                                    {editing
                                        ? 'Password Baru (Opsional)'
                                        : 'Password'}
                                </Label>
                                <Input
                                    id="st-pass"
                                    type="password"
                                    minLength={8}
                                    value={form.data.password}
                                    onChange={(e) =>
                                        form.setData('password', e.target.value)
                                    }
                                    required={!editing}
                                />
                            </div>
                        </div>

                        {!editing && (
                            <div className="space-y-1.5">
                                <Label htmlFor="st-pin">
                                    PIN 6 Digit (Opsional, wajib untuk Admin)
                                </Label>
                                <Input
                                    id="st-pin"
                                    maxLength={6}
                                    value={form.data.pin}
                                    onChange={(e) =>
                                        form.setData('pin', e.target.value)
                                    }
                                    placeholder="123456"
                                    className="font-money"
                                />
                            </div>
                        )}

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(e) =>
                                    form.setData('is_active', e.target.checked)
                                }
                            />
                            Akun Aktif
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

            <Dialog
                open={pinTarget !== null}
                onOpenChange={(open) => !open && setPinTarget(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Atur PIN Otorisasi — {pinTarget?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitPin} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="reset-pin">
                                PIN 6 Digit Baru (Kosongkan untuk menghapus PIN)
                            </Label>
                            <Input
                                id="reset-pin"
                                maxLength={6}
                                value={pinForm.data.pin}
                                onChange={(e) =>
                                    pinForm.setData('pin', e.target.value)
                                }
                                placeholder="6 digit angka"
                                className="font-money"
                            />
                            {pinForm.errors.pin && (
                                <p className="text-xs text-destructive">
                                    {pinForm.errors.pin}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPinTarget(null)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={pinForm.processing}>
                                Simpan PIN
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
