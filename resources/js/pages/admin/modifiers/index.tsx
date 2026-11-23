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
import { formatRupiah } from '@/lib/format';

type ModifierOptionItem = {
    id: number;
    modifier_group_id: number;
    name: string;
    price_delta: number;
    is_default: boolean;
    is_available: boolean;
    ingredient_id: number | null;
    ingredient_name: string | null;
    ingredient_unit: string | null;
    ingredient_qty: number | null;
    sort_order: number;
};

type ModifierGroupItem = {
    id: number;
    name: string;
    selection_type: 'single' | 'multiple';
    is_required: boolean;
    min_select: number;
    max_select: number;
    sort_order: number;
    menu_items_count: number;
    options: ModifierOptionItem[];
};

type IngredientOption = {
    id: number;
    name: string;
    unit: string;
};

export default function AdminModifiersIndex({
    modifierGroups,
    ingredients,
}: {
    modifierGroups: ModifierGroupItem[];
    ingredients: IngredientOption[];
}) {
    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ModifierGroupItem | null>(
        null,
    );

    const groupForm = useForm({
        name: '',
        selection_type: 'single' as 'single' | 'multiple',
        is_required: false,
        min_select: 0,
        max_select: 1,
        sort_order: 0,
    });

    const [optionDialogOpen, setOptionDialogOpen] = useState(false);
    const [targetGroup, setTargetGroup] = useState<ModifierGroupItem | null>(
        null,
    );
    const [editingOption, setEditingOption] =
        useState<ModifierOptionItem | null>(null);

    const optionForm = useForm({
        name: '',
        price_delta: 0,
        is_default: false,
        is_available: true,
        ingredient_id: '' as string | number,
        ingredient_qty: '',
        sort_order: 0,
    });

    const openCreateGroup = () => {
        setEditingGroup(null);
        groupForm.setData({
            name: '',
            selection_type: 'single',
            is_required: false,
            min_select: 0,
            max_select: 1,
            sort_order: modifierGroups.length + 1,
        });
        setGroupDialogOpen(true);
    };

    const openEditGroup = (group: ModifierGroupItem) => {
        setEditingGroup(group);
        groupForm.setData({
            name: group.name,
            selection_type: group.selection_type,
            is_required: group.is_required,
            min_select: group.min_select,
            max_select: group.max_select,
            sort_order: group.sort_order,
        });
        setGroupDialogOpen(true);
    };

    const submitGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingGroup) {
            groupForm.put(`/admin/modifiers/${editingGroup.id}`, {
                onSuccess: () => setGroupDialogOpen(false),
            });
        } else {
            groupForm.post('/admin/modifiers', {
                onSuccess: () => setGroupDialogOpen(false),
            });
        }
    };

    const openCreateOption = (group: ModifierGroupItem) => {
        setTargetGroup(group);
        setEditingOption(null);
        optionForm.setData({
            name: '',
            price_delta: 0,
            is_default: false,
            is_available: true,
            ingredient_id: '',
            ingredient_qty: '',
            sort_order: group.options.length + 1,
        });
        setOptionDialogOpen(true);
    };

    const openEditOption = (
        group: ModifierGroupItem,
        option: ModifierOptionItem,
    ) => {
        setTargetGroup(group);
        setEditingOption(option);
        optionForm.setData({
            name: option.name,
            price_delta: option.price_delta,
            is_default: option.is_default,
            is_available: option.is_available,
            ingredient_id: option.ingredient_id ?? '',
            ingredient_qty:
                option.ingredient_qty !== null
                    ? String(option.ingredient_qty)
                    : '',
            sort_order: option.sort_order,
        });
        setOptionDialogOpen(true);
    };

    const submitOption = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetGroup) {
            return;
        }

        optionForm.transform((data) => ({
            ...data,
            ingredient_id: data.ingredient_id
                ? Number(data.ingredient_id)
                : null,
            ingredient_qty: data.ingredient_id
                ? Number(data.ingredient_qty)
                : null,
        }));

        if (editingOption) {
            optionForm.put(
                `/admin/modifiers/${targetGroup.id}/options/${editingOption.id}`,
                { onSuccess: () => setOptionDialogOpen(false) },
            );
        } else {
            optionForm.post(`/admin/modifiers/${targetGroup.id}/options`, {
                onSuccess: () => setOptionDialogOpen(false),
            });
        }
    };

    return (
        <>
            <Head title="Grup & Opsi Modifier" />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Grup & Opsi Modifier
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Atur pilihan kustomisasi minuman (Suhu, Level Gula,
                            Jenis Susu, Tambahan) beserta dampak harga dan BOM.
                        </p>
                    </div>
                    <Button
                        onClick={openCreateGroup}
                        className="min-h-11 gap-2"
                    >
                        <Plus className="size-4" />
                        Tambah Grup Modifier
                    </Button>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    {modifierGroups.map((group) => (
                        <div
                            key={group.id}
                            className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs"
                        >
                            <div className="flex items-start justify-between gap-3 border-b pb-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-bold">
                                            {group.name}
                                        </h2>
                                        <Badge
                                            variant={
                                                group.is_required
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {group.is_required
                                                ? 'Wajib'
                                                : 'Opsional'}
                                        </Badge>
                                        <Badge variant="outline">
                                            {group.selection_type === 'single'
                                                ? 'Pilih 1'
                                                : `Maks ${group.max_select}`}
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Dipakai di {group.menu_items_count} menu
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditGroup(group)}
                                    >
                                        <Edit2 className="size-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    `Hapus grup "${group.name}"?`,
                                                )
                                            ) {
                                                router.delete(
                                                    `/admin/modifiers/${group.id}`,
                                                );
                                            }
                                        }}
                                    >
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-4 flex-1 space-y-2">
                                {group.options.map((opt) => (
                                    <div
                                        key={opt.id}
                                        className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2.5 text-sm"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">
                                                    {opt.name}
                                                </span>
                                                {opt.is_default && (
                                                    <Badge variant="secondary">
                                                        Default
                                                    </Badge>
                                                )}
                                                {!opt.is_available && (
                                                    <Badge variant="destructive">
                                                        Nonaktif
                                                    </Badge>
                                                )}
                                            </div>
                                            {opt.ingredient_name && (
                                                <p className="text-xs text-muted-foreground">
                                                    BOM: {opt.ingredient_name} (
                                                    {opt.ingredient_qty}{' '}
                                                    {opt.ingredient_unit})
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="font-money text-xs font-semibold text-primary">
                                                {opt.price_delta > 0
                                                    ? `+${formatRupiah(opt.price_delta)}`
                                                    : 'Gratis'}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    openEditOption(group, opt)
                                                }
                                            >
                                                <Edit2 className="size-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            `Hapus opsi "${opt.name}"?`,
                                                        )
                                                    ) {
                                                        router.delete(
                                                            `/admin/modifiers/${group.id}/options/${opt.id}`,
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

                            <div className="mt-4 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-1.5"
                                    onClick={() => openCreateOption(group)}
                                >
                                    <Plus className="size-4" />
                                    Tambah Opsi ke {group.name}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingGroup
                                ? 'Edit Grup Modifier'
                                : 'Tambah Grup Modifier'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitGroup} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="grp-name">Nama Grup</Label>
                            <Input
                                id="grp-name"
                                value={groupForm.data.name}
                                onChange={(e) =>
                                    groupForm.setData('name', e.target.value)
                                }
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="grp-type">Tipe Pilihan</Label>
                                <select
                                    id="grp-type"
                                    value={groupForm.data.selection_type}
                                    onChange={(e) =>
                                        groupForm.setData(
                                            'selection_type',
                                            e.target.value as
                                                | 'single'
                                                | 'multiple',
                                        )
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="single">Pilih Satu</option>
                                    <option value="multiple">
                                        Pilih Banyak
                                    </option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="grp-max">Maksimal Pilih</Label>
                                <Input
                                    id="grp-max"
                                    type="number"
                                    min={1}
                                    value={groupForm.data.max_select}
                                    onChange={(e) =>
                                        groupForm.setData(
                                            'max_select',
                                            Number(e.target.value),
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={groupForm.data.is_required}
                                onChange={(e) => {
                                    const req = e.target.checked;
                                    groupForm.setData({
                                        ...groupForm.data,
                                        is_required: req,
                                        min_select: req ? 1 : 0,
                                    });
                                }}
                            />
                            Wajib dipilih pelanggan
                        </label>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setGroupDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={groupForm.processing}
                            >
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingOption
                                ? `Edit Opsi (${targetGroup?.name})`
                                : `Tambah Opsi (${targetGroup?.name})`}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitOption} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="opt-name">Nama Opsi</Label>
                                <Input
                                    id="opt-name"
                                    value={optionForm.data.name}
                                    onChange={(e) =>
                                        optionForm.setData(
                                            'name',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="opt-delta">
                                    Tambahan Harga (Rp)
                                </Label>
                                <Input
                                    id="opt-delta"
                                    type="number"
                                    min={0}
                                    value={optionForm.data.price_delta}
                                    onChange={(e) =>
                                        optionForm.setData(
                                            'price_delta',
                                            Number(e.target.value),
                                        )
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="opt-ing">
                                    Potong Bahan Baku (Opsional)
                                </Label>
                                <select
                                    id="opt-ing"
                                    value={optionForm.data.ingredient_id}
                                    onChange={(e) =>
                                        optionForm.setData(
                                            'ingredient_id',
                                            e.target.value,
                                        )
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="">
                                        Tidak memotong bahan
                                    </option>
                                    {ingredients.map((ing) => (
                                        <option key={ing.id} value={ing.id}>
                                            {ing.name} ({ing.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="opt-qty">Takaran Bahan</Label>
                                <Input
                                    id="opt-qty"
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    disabled={!optionForm.data.ingredient_id}
                                    value={optionForm.data.ingredient_qty}
                                    onChange={(e) =>
                                        optionForm.setData(
                                            'ingredient_qty',
                                            e.target.value,
                                        )
                                    }
                                    required={Boolean(
                                        optionForm.data.ingredient_id,
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={optionForm.data.is_default}
                                    onChange={(e) =>
                                        optionForm.setData(
                                            'is_default',
                                            e.target.checked,
                                        )
                                    }
                                />
                                Pilihan Default
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={optionForm.data.is_available}
                                    onChange={(e) =>
                                        optionForm.setData(
                                            'is_available',
                                            e.target.checked,
                                        )
                                    }
                                />
                                Tersedia
                            </label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOptionDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={optionForm.processing}
                            >
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
