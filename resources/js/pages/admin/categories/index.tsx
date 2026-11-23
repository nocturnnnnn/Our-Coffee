import { Head, router, useForm } from '@inertiajs/react';
import { Edit2, FolderPlus, Trash2 } from 'lucide-react';
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

type CategoryItem = {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    sort_order: number;
    is_active: boolean;
    menu_items_count: number;
};

const ICON_OPTIONS = [
    { value: 'sparkles', label: 'Sparkles (Signature)' },
    { value: 'coffee', label: 'Coffee' },
    { value: 'cup-soda', label: 'Cold Drink' },
    { value: 'croissant', label: 'Pastry' },
    { value: 'utensils', label: 'Food' },
];

export default function AdminCategoriesIndex({
    categories,
}: {
    categories: CategoryItem[];
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<CategoryItem | null>(null);

    const form = useForm({
        name: '',
        icon: 'coffee',
        sort_order: 0,
        is_active: true,
    });

    const openCreate = () => {
        setEditing(null);
        form.setData({
            name: '',
            icon: 'coffee',
            sort_order: categories.length + 1,
            is_active: true,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEdit = (category: CategoryItem) => {
        setEditing(category);
        form.setData({
            name: category.name,
            icon: category.icon ?? 'coffee',
            sort_order: category.sort_order,
            is_active: category.is_active,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editing) {
            form.put(`/admin/categories/${editing.id}`, {
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            form.post('/admin/categories', {
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    const handleDelete = (category: CategoryItem) => {
        if (!window.confirm(`Hapus kategori "${category.name}"?`)) {
            return;
        }
        router.delete(`/admin/categories/${category.id}`);
    };

    return (
        <>
            <Head title="Kategori Menu" />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Kategori Menu
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Atur urutan kategori pada Left Rail Kiosk dan POS
                            Kasir.
                        </p>
                    </div>
                    <Button onClick={openCreate} className="min-h-11 gap-2">
                        <FolderPlus className="size-4" />
                        Tambah Kategori
                    </Button>
                </div>

                <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3">Urutan</th>
                                <th className="px-4 py-3">Nama Kategori</th>
                                <th className="px-4 py-3">Ikon Rail</th>
                                <th className="px-4 py-3">Jumlah Menu</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {categories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-muted/30">
                                    <td className="font-money px-4 py-3 font-semibold">
                                        {cat.sort_order}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold">
                                            {cat.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            /{cat.slug}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {cat.icon ?? 'coffee'}
                                    </td>
                                    <td className="font-money px-4 py-3">
                                        {cat.menu_items_count} menu
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={
                                                cat.is_active
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {cat.is_active
                                                ? 'Aktif'
                                                : 'Nonaktif'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEdit(cat)}
                                            >
                                                <Edit2 className="size-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleDelete(cat)
                                                }
                                                disabled={
                                                    cat.menu_items_count > 0
                                                }
                                            >
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        Belum ada kategori menu.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? 'Edit Kategori' : 'Tambah Kategori'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Nama Kategori</Label>
                            <Input
                                id="cat-name"
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                                required
                            />
                            {form.errors.name && (
                                <p className="text-xs text-destructive">
                                    {form.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cat-icon">Ikon Left Rail</Label>
                                <select
                                    id="cat-icon"
                                    value={form.data.icon}
                                    onChange={(e) =>
                                        form.setData('icon', e.target.value)
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    {ICON_OPTIONS.map((opt) => (
                                        <option
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cat-sort">Urutan</Label>
                                <Input
                                    id="cat-sort"
                                    type="number"
                                    min={0}
                                    value={form.data.sort_order}
                                    onChange={(e) =>
                                        form.setData(
                                            'sort_order',
                                            Number(e.target.value),
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(e) =>
                                    form.setData('is_active', e.target.checked)
                                }
                            />
                            Tampilkan di Kiosk & POS
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
