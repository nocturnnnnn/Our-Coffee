import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownToLine,
    ClipboardCheck,
    Edit2,
    Plus,
} from 'lucide-react';
import { useState } from 'react';
import { StockLevelBar } from '@/components/stock-level-bar';
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
import { formatDateWib, formatRupiah, formatTimeWib } from '@/lib/format';
import { cn } from '@/lib/utils';

type IngredientItem = {
    id: number;
    name: string;
    sku: string | null;
    unit: 'g' | 'ml' | 'pcs';
    current_stock: number;
    min_stock: number;
    cost_per_unit: number;
    default_distributor_id: number | null;
    default_distributor_name: string | null;
    is_active: boolean;
    is_low_stock: boolean;
};

type DistributorOption = {
    id: number;
    name: string;
};

type MovementItem = {
    id: number;
    ingredient_id: number;
    ingredient_name: string;
    unit: string;
    type: string;
    type_label: string;
    quantity_change: number;
    stock_before: number;
    stock_after: number;
    unit_cost: number | null;
    total_cost: number | null;
    distributor_name: string | null;
    notes: string | null;
    creator_name: string | null;
    created_at: string | null;
};

export default function AdminInventoryIndex({
    ingredients,
    distributors,
    movements,
}: {
    ingredients: IngredientItem[];
    distributors: DistributorOption[];
    movements: MovementItem[];
}) {
    const [tab, setTab] = useState<'stock' | 'movements'>('stock');

    const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] =
        useState<IngredientItem | null>(null);
    const ingForm = useForm({
        name: '',
        sku: '',
        unit: 'g' as 'g' | 'ml' | 'pcs',
        current_stock: 0,
        min_stock: 100,
        cost_per_unit: 0,
        default_distributor_id: '' as string | number,
        is_active: true,
    });

    const [restockTarget, setRestockTarget] = useState<IngredientItem | null>(
        null,
    );
    const restockForm = useForm({
        quantity: '',
        total_cost: '',
        distributor_id: '' as string | number,
        notes: '',
    });

    const [wasteTarget, setWasteTarget] = useState<IngredientItem | null>(null);
    const wasteForm = useForm({
        quantity: '',
        reason: '',
    });

    const [opnameTarget, setOpnameTarget] = useState<IngredientItem | null>(
        null,
    );
    const opnameForm = useForm({
        actual_stock: '',
        reason: '',
    });

    const openCreateIngredient = () => {
        setEditingIngredient(null);
        ingForm.setData({
            name: '',
            sku: '',
            unit: 'g',
            current_stock: 0,
            min_stock: 100,
            cost_per_unit: 0,
            default_distributor_id: distributors[0]?.id ?? '',
            is_active: true,
        });
        setIngredientModalOpen(true);
    };

    const openEditIngredient = (ing: IngredientItem) => {
        setEditingIngredient(ing);
        ingForm.setData({
            name: ing.name,
            sku: ing.sku ?? '',
            unit: ing.unit,
            current_stock: ing.current_stock,
            min_stock: ing.min_stock,
            cost_per_unit: ing.cost_per_unit,
            default_distributor_id: ing.default_distributor_id ?? '',
            is_active: ing.is_active,
        });
        setIngredientModalOpen(true);
    };

    const submitIngredient = (e: React.FormEvent) => {
        e.preventDefault();
        ingForm.transform((data) => ({
            ...data,
            default_distributor_id: data.default_distributor_id
                ? Number(data.default_distributor_id)
                : null,
        }));

        if (editingIngredient) {
            ingForm.put(
                `/admin/inventory/ingredients/${editingIngredient.id}`,
                { onSuccess: () => setIngredientModalOpen(false) },
            );
        } else {
            ingForm.post('/admin/inventory/ingredients', {
                onSuccess: () => setIngredientModalOpen(false),
            });
        }
    };

    const openRestock = (ing: IngredientItem) => {
        setRestockTarget(ing);
        restockForm.setData({
            quantity: '',
            total_cost: '',
            distributor_id: ing.default_distributor_id ?? '',
            notes: '',
        });
    };

    const submitRestock = (e: React.FormEvent) => {
        e.preventDefault();
        if (!restockTarget) {
            return;
        }
        restockForm.transform((data) => ({
            ...data,
            quantity: Number(data.quantity),
            total_cost: Number(data.total_cost),
            distributor_id: data.distributor_id
                ? Number(data.distributor_id)
                : null,
        }));
        restockForm.post(
            `/admin/inventory/ingredients/${restockTarget.id}/restock`,
            { onSuccess: () => setRestockTarget(null) },
        );
    };

    const submitWaste = (e: React.FormEvent) => {
        e.preventDefault();
        if (!wasteTarget) {
            return;
        }
        wasteForm.transform((data) => ({
            ...data,
            quantity: Number(data.quantity),
        }));
        wasteForm.post(`/admin/inventory/ingredients/${wasteTarget.id}/waste`, {
            onSuccess: () => setWasteTarget(null),
        });
    };

    const submitOpname = (e: React.FormEvent) => {
        e.preventDefault();
        if (!opnameTarget) {
            return;
        }
        opnameForm.transform((data) => ({
            ...data,
            actual_stock: Number(data.actual_stock),
        }));
        opnameForm.post(
            `/admin/inventory/ingredients/${opnameTarget.id}/opname`,
            { onSuccess: () => setOpnameTarget(null) },
        );
    };

    const restockQty = Number(restockForm.data.quantity) || 0;
    const restockCost = Number(restockForm.data.total_cost) || 0;
    const estimatedUnitCost =
        restockQty > 0 ? Math.round(restockCost / restockQty) : 0;

    return (
        <>
            <Head title="Inventaris & Stock In" />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Inventaris Bahan Baku
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Pantau stok real-time, catat Stock In dari
                            distributor, waste, dan stock opname.
                        </p>
                    </div>
                    <Button
                        onClick={openCreateIngredient}
                        className="min-h-11 gap-2"
                    >
                        <Plus className="size-4" />
                        Tambah Bahan Baku
                    </Button>
                </div>

                <div className="flex items-center gap-2 border-b pb-2">
                    <button
                        type="button"
                        onClick={() => setTab('stock')}
                        className={cn(
                            'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                            tab === 'stock'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        Stok Bahan Baku ({ingredients.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('movements')}
                        className={cn(
                            'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                            tab === 'movements'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        Riwayat Mutasi ({movements.length})
                    </button>
                </div>

                {tab === 'stock' ? (
                    <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Bahan Baku</th>
                                    <th className="px-4 py-3">Level Stok</th>
                                    <th className="px-4 py-3">Harga / Unit</th>
                                    <th className="px-4 py-3">Distributor</th>
                                    <th className="px-4 py-3 text-right">
                                        Aksi Stok
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {ingredients.map((ing) => (
                                    <tr
                                        key={ing.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-semibold">
                                                {ing.name}
                                            </p>
                                            <p className="font-money text-xs text-muted-foreground">
                                                {ing.sku ?? '-'} · Unit:{' '}
                                                {ing.unit}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StockLevelBar
                                                currentStock={ing.current_stock}
                                                minStock={ing.min_stock}
                                                unit={ing.unit}
                                            />
                                        </td>
                                        <td className="font-money px-4 py-3 font-semibold">
                                            {formatRupiah(ing.cost_per_unit)} /{' '}
                                            {ing.unit}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {ing.default_distributor_name ??
                                                '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex flex-wrap justify-end gap-1.5">
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        openRestock(ing)
                                                    }
                                                    className="gap-1"
                                                >
                                                    <ArrowDownToLine className="size-3.5" />
                                                    Stock In
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setWasteTarget(ing);
                                                        wasteForm.setData({
                                                            quantity: '',
                                                            reason: '',
                                                        });
                                                    }}
                                                    className="gap-1"
                                                >
                                                    <AlertTriangle className="size-3.5 text-amber-700" />
                                                    Waste
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setOpnameTarget(ing);
                                                        opnameForm.setData({
                                                            actual_stock:
                                                                String(
                                                                    ing.current_stock,
                                                                ),
                                                            reason: '',
                                                        });
                                                    }}
                                                    className="gap-1"
                                                >
                                                    <ClipboardCheck className="size-3.5" />
                                                    Opname
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        openEditIngredient(ing)
                                                    }
                                                >
                                                    <Edit2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Waktu</th>
                                    <th className="px-4 py-3">Bahan Baku</th>
                                    <th className="px-4 py-3">Tipe</th>
                                    <th className="px-4 py-3">Perubahan</th>
                                    <th className="px-4 py-3">
                                        Sebelum → Sesudah
                                    </th>
                                    <th className="px-4 py-3">Catatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {movements.map((mov) => (
                                    <tr
                                        key={mov.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {mov.created_at
                                                ? `${formatDateWib(mov.created_at)} ${formatTimeWib(mov.created_at)}`
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 font-semibold">
                                            {mov.ingredient_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline">
                                                {mov.type_label}
                                            </Badge>
                                        </td>
                                        <td
                                            className={cn(
                                                'font-money px-4 py-3 font-semibold',
                                                mov.quantity_change >= 0
                                                    ? 'text-emerald-700'
                                                    : 'text-red-700',
                                            )}
                                        >
                                            {mov.quantity_change >= 0
                                                ? '+'
                                                : ''}
                                            {mov.quantity_change} {mov.unit}
                                        </td>
                                        <td className="font-money px-4 py-3 text-xs">
                                            {mov.stock_before} →{' '}
                                            {mov.stock_after} {mov.unit}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {mov.notes ??
                                                mov.distributor_name ??
                                                '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Dialog
                open={ingredientModalOpen}
                onOpenChange={setIngredientModalOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingIngredient
                                ? 'Edit Bahan Baku'
                                : 'Tambah Bahan Baku'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitIngredient} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="ing-name">Nama Bahan</Label>
                                <Input
                                    id="ing-name"
                                    value={ingForm.data.name}
                                    onChange={(e) =>
                                        ingForm.setData('name', e.target.value)
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ing-sku">SKU</Label>
                                <Input
                                    id="ing-sku"
                                    value={ingForm.data.sku}
                                    onChange={(e) =>
                                        ingForm.setData('sku', e.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="ing-unit">Satuan</Label>
                                <select
                                    id="ing-unit"
                                    value={ingForm.data.unit}
                                    onChange={(e) =>
                                        ingForm.setData(
                                            'unit',
                                            e.target.value as
                                                | 'g'
                                                | 'ml'
                                                | 'pcs',
                                        )
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="g">Gram (g)</option>
                                    <option value="ml">Mililiter (ml)</option>
                                    <option value="pcs">Pcs</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ing-min">Batas Min</Label>
                                <Input
                                    id="ing-min"
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={ingForm.data.min_stock}
                                    onChange={(e) =>
                                        ingForm.setData(
                                            'min_stock',
                                            Number(e.target.value),
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ing-cost">
                                    Harga/Unit (Rp)
                                </Label>
                                <Input
                                    id="ing-cost"
                                    type="number"
                                    min={0}
                                    value={ingForm.data.cost_per_unit}
                                    onChange={(e) =>
                                        ingForm.setData(
                                            'cost_per_unit',
                                            Number(e.target.value),
                                        )
                                    }
                                    required
                                />
                            </div>
                        </div>

                        {!editingIngredient && (
                            <div className="space-y-1.5">
                                <Label htmlFor="ing-init">Stok Awal</Label>
                                <Input
                                    id="ing-init"
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={ingForm.data.current_stock}
                                    onChange={(e) =>
                                        ingForm.setData(
                                            'current_stock',
                                            Number(e.target.value),
                                        )
                                    }
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="ing-dist">
                                Distributor Default
                            </Label>
                            <select
                                id="ing-dist"
                                value={ingForm.data.default_distributor_id}
                                onChange={(e) =>
                                    ingForm.setData(
                                        'default_distributor_id',
                                        e.target.value,
                                    )
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Pilih Distributor</option>
                                {distributors.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIngredientModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={ingForm.processing}>
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={restockTarget !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRestockTarget(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Stock In — {restockTarget?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitRestock} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="rs-qty">
                                    Jumlah Masuk ({restockTarget?.unit})
                                </Label>
                                <Input
                                    id="rs-qty"
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={restockForm.data.quantity}
                                    onChange={(e) =>
                                        restockForm.setData(
                                            'quantity',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="rs-cost">
                                    Total Harga Beli (Rp)
                                </Label>
                                <Input
                                    id="rs-cost"
                                    type="number"
                                    min={0}
                                    value={restockForm.data.total_cost}
                                    onChange={(e) =>
                                        restockForm.setData(
                                            'total_cost',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                        </div>

                        {estimatedUnitCost > 0 && (
                            <p className="font-money rounded-lg bg-muted px-3 py-2 text-xs font-medium">
                                Harga beli terbaru:{' '}
                                {formatRupiah(estimatedUnitCost)} /{' '}
                                {restockTarget?.unit}
                            </p>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="rs-dist">Distributor</Label>
                            <select
                                id="rs-dist"
                                value={restockForm.data.distributor_id}
                                onChange={(e) =>
                                    restockForm.setData(
                                        'distributor_id',
                                        e.target.value,
                                    )
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Pilih Distributor</option>
                                {distributors.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="rs-notes">Catatan</Label>
                            <Input
                                id="rs-notes"
                                value={restockForm.data.notes}
                                onChange={(e) =>
                                    restockForm.setData('notes', e.target.value)
                                }
                                placeholder="No. faktur / keterangan"
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRestockTarget(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={restockForm.processing}
                            >
                                Simpan Stock In
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={wasteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setWasteTarget(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Catat Waste — {wasteTarget?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitWaste} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="ws-qty">
                                Jumlah Terbuang ({wasteTarget?.unit})
                            </Label>
                            <Input
                                id="ws-qty"
                                type="number"
                                step="0.001"
                                min="0.001"
                                value={wasteForm.data.quantity}
                                onChange={(e) =>
                                    wasteForm.setData(
                                        'quantity',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="ws-reason">Alasan Waste</Label>
                            <Input
                                id="ws-reason"
                                value={wasteForm.data.reason}
                                onChange={(e) =>
                                    wasteForm.setData('reason', e.target.value)
                                }
                                required
                                placeholder="Contoh: Kedaluwarsa / tumpah"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setWasteTarget(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={wasteForm.processing}
                            >
                                Simpan Waste
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={opnameTarget !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setOpnameTarget(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Stock Opname — {opnameTarget?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitOpname} className="space-y-4">
                        <p className="font-money text-xs text-muted-foreground">
                            Stok tercatat saat ini:{' '}
                            {opnameTarget?.current_stock} {opnameTarget?.unit}
                        </p>
                        <div className="space-y-1.5">
                            <Label htmlFor="op-actual">
                                Stok Fisik Aktual ({opnameTarget?.unit})
                            </Label>
                            <Input
                                id="op-actual"
                                type="number"
                                step="0.001"
                                min="0"
                                value={opnameForm.data.actual_stock}
                                onChange={(e) =>
                                    opnameForm.setData(
                                        'actual_stock',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="op-reason">
                                Alasan Penyesuaian
                            </Label>
                            <Input
                                id="op-reason"
                                value={opnameForm.data.reason}
                                onChange={(e) =>
                                    opnameForm.setData('reason', e.target.value)
                                }
                                required
                                placeholder="Contoh: Opname fisik akhir shift"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpnameTarget(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={opnameForm.processing}
                            >
                                Simpan Opname
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
