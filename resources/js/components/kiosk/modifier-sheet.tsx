import { Minus, Plus } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type {
    KioskCartItem,
    KioskMenuItem,
    KioskModifierGroup,
} from '@/stores/kiosk-cart-store';

type ModifierSheetProps = {
    menuItem: KioskMenuItem | null;
    editingCartItem?: KioskCartItem | null;
    open: boolean;
    onClose: () => void;
    onConfirm: (
        item: Omit<KioskCartItem, 'lineId'> & { lineId?: string },
    ) => void;
};

function buildInitialSelections(
    menuItem: KioskMenuItem,
    editingCartItem?: KioskCartItem | null,
): Record<number, number[]> {
    const initial: Record<number, number[]> = {};
    const editingIds = new Set(
        editingCartItem?.selectedModifiers.map((m) => m.optionId) ?? [],
    );

    for (const group of menuItem.modifier_groups) {
        if (editingCartItem) {
            initial[group.id] = group.options
                .filter((opt) => editingIds.has(opt.id))
                .map((opt) => opt.id);
        } else {
            const defaults = group.options
                .filter((opt) => opt.is_default)
                .map((opt) => opt.id);

            if (
                defaults.length === 0 &&
                group.is_required &&
                group.options[0]
            ) {
                initial[group.id] = [group.options[0].id];
            } else {
                initial[group.id] = defaults;
            }
        }
    }

    return initial;
}

export function ModifierSheet({
    menuItem,
    editingCartItem,
    open,
    onClose,
    onConfirm,
}: ModifierSheetProps) {
    if (!menuItem) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <ModifierSheetBody
                    key={`${menuItem.id}-${editingCartItem?.lineId ?? 'new'}`}
                    menuItem={menuItem}
                    editingCartItem={editingCartItem}
                    onClose={onClose}
                    onConfirm={onConfirm}
                />
            </DialogContent>
        </Dialog>
    );
}

function ModifierSheetBody({
    menuItem,
    editingCartItem,
    onClose,
    onConfirm,
}: {
    menuItem: KioskMenuItem;
    editingCartItem?: KioskCartItem | null;
    onClose: () => void;
    onConfirm: (
        item: Omit<KioskCartItem, 'lineId'> & { lineId?: string },
    ) => void;
}) {
    const [selections, setSelections] = useState<Record<number, number[]>>(() =>
        buildInitialSelections(menuItem, editingCartItem),
    );
    const [quantity, setQuantity] = useState<number>(
        editingCartItem?.quantity ?? 1,
    );
    const [notes, setNotes] = useState<string>(editingCartItem?.notes ?? '');

    const toggleOption = (group: KioskModifierGroup, optionId: number) => {
        setSelections((prev) => {
            const current = prev[group.id] ?? [];

            if (group.selection_type === 'single') {
                if (current.includes(optionId)) {
                    if (group.is_required || group.min_select >= 1) {
                        return prev;
                    }
                    return { ...prev, [group.id]: [] };
                }
                return { ...prev, [group.id]: [optionId] };
            }

            if (current.includes(optionId)) {
                if (current.length <= group.min_select) {
                    return prev;
                }
                return {
                    ...prev,
                    [group.id]: current.filter((id) => id !== optionId),
                };
            }

            if (current.length >= group.max_select) {
                return prev;
            }

            return { ...prev, [group.id]: [...current, optionId] };
        });
    };

    const selectedModifiers: KioskCartItem['selectedModifiers'] = [];
    let modifiersTotal = 0;

    for (const group of menuItem.modifier_groups) {
        const chosenIds = selections[group.id] ?? [];
        for (const opt of group.options) {
            if (chosenIds.includes(opt.id)) {
                modifiersTotal += opt.price_delta;
                selectedModifiers.push({
                    optionId: opt.id,
                    groupName: group.name,
                    optionName: opt.name,
                    priceDelta: opt.price_delta,
                });
            }
        }
    }

    const isValidSelection = menuItem.modifier_groups.every((group) => {
        const count = (selections[group.id] ?? []).length;
        const min = group.is_required
            ? Math.max(1, group.min_select)
            : group.min_select;
        return count >= min && count <= group.max_select;
    });

    const unitTotal = menuItem.price + modifiersTotal;
    const lineTotal = unitTotal * quantity;

    const handleConfirm = () => {
        if (!isValidSelection) {
            return;
        }
        onConfirm({
            lineId: editingCartItem?.lineId,
            menuItemId: menuItem.id,
            name: menuItem.name,
            imageUrl: menuItem.image_url,
            unitPrice: menuItem.price,
            modifiersTotal,
            quantity,
            notes: notes.trim(),
            selectedModifiers,
        });
        onClose();
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                    {menuItem.name}
                </DialogTitle>
                {menuItem.description && (
                    <p className="text-sm text-muted-foreground">
                        {menuItem.description}
                    </p>
                )}
            </DialogHeader>

            <div className="space-y-5 py-2">
                {menuItem.modifier_groups.map((group) => {
                    const selected = selections[group.id] ?? [];
                    return (
                        <div key={group.id} className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-bold">
                                    {group.name}
                                </p>
                                <Badge
                                    variant={
                                        group.is_required
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {group.is_required
                                        ? 'Wajib'
                                        : group.selection_type === 'multiple'
                                          ? `Opsional · Maks ${group.max_select}`
                                          : 'Opsional'}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                {group.options.map((opt) => {
                                    const active = selected.includes(opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() =>
                                                toggleOption(group, opt.id)
                                            }
                                            className={cn(
                                                'flex min-h-16 flex-col items-start justify-center rounded-xl border-2 px-4 py-2.5 text-left transition-colors',
                                                active
                                                    ? 'border-primary bg-primary/10 text-foreground'
                                                    : 'border-border bg-card hover:bg-muted/50',
                                            )}
                                        >
                                            <span className="text-sm font-semibold">
                                                {opt.name}
                                            </span>
                                            <span className="font-money text-xs text-muted-foreground">
                                                {opt.price_delta > 0
                                                    ? `+${formatRupiah(opt.price_delta)}`
                                                    : 'Gratis'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                <div className="space-y-1.5">
                    <Label htmlFor="kiosk-item-notes">
                        Catatan Khusus (Opsional)
                    </Label>
                    <Input
                        id="kiosk-item-notes"
                        maxLength={255}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Contoh: Es sedikit, pisah gelas"
                        className="h-12"
                    />
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-3">
                    <span className="text-sm font-semibold">Jumlah</span>
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setQuantity((q) => Math.max(1, q - 1))
                            }
                            className="min-h-16 min-w-16 rounded-xl"
                            aria-label="Kurangi jumlah"
                        >
                            <Minus className="size-6" />
                        </Button>
                        <span className="font-money min-w-10 text-center text-xl font-bold">
                            {quantity}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setQuantity((q) => Math.min(50, q + 1))
                            }
                            className="min-h-16 min-w-16 rounded-xl"
                            aria-label="Tambah jumlah"
                        >
                            <Plus className="size-6" />
                        </Button>
                    </div>
                </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="min-h-16 px-6 text-base"
                >
                    Batal
                </Button>
                <Button
                    type="button"
                    disabled={!isValidSelection}
                    onClick={handleConfirm}
                    className="min-h-16 flex-1 px-6 text-base font-bold"
                >
                    <span>
                        {editingCartItem
                            ? 'Simpan Perubahan'
                            : 'Tambah ke Keranjang'}
                    </span>
                    <span className="font-money ml-2">
                        · {formatRupiah(lineTotal)}
                    </span>
                </Button>
            </DialogFooter>
        </>
    );
}
