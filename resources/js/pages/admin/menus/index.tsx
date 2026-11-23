import { Head, router } from '@inertiajs/react';
import {
    Coffee,
    Edit2,
    FlaskConical,
    Plus,
    Power,
    Search,
    Trash2,
} from 'lucide-react';
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

type RecipeRow = {
    ingredient_id: number;
    ingredient_name: string;
    unit: string;
    cost_per_unit: number;
    quantity: number;
};

type MenuItemData = {
    id: number;
    category_id: number;
    category_name: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    image_url: string | null;
    badge: 'best_seller' | 'new' | null;
    is_available: boolean;
    is_active: boolean;
    sort_order: number;
    cogs: number;
    gross_profit: number;
    gross_margin_percent: number;
    effective_available: boolean;
    unavailable_reason: string | null;
    max_servings: number | null;
    modifier_group_ids: number[];
    recipe_items: RecipeRow[];
};

type CategoryOption = {
    id: number;
    name: string;
    is_active: boolean;
};

type ModifierGroupOption = {
    id: number;
    name: string;
    selection_type: string;
    is_required: boolean;
};

type IngredientOption = {
    id: number;
    name: string;
    unit: string;
    cost_per_unit: number;
};

type Props = {
    menus: MenuItemData[];
    categories: CategoryOption[];
    modifierGroups: ModifierGroupOption[];
    ingredients: IngredientOption[];
    filters: {
        search: string;
        category_id: number | null;
    };
};

export default function AdminMenusIndex({
    menus,
    categories,
    modifierGroups,
    ingredients,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [selectedCategory, setSelectedCategory] = useState<string>(
        filters.category_id ? String(filters.category_id) : '',
    );

    const [menuDialogOpen, setMenuDialogOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<MenuItemData | null>(null);
    const [submittingMenu, setSubmittingMenu] = useState(false);
    const [formState, setFormState] = useState({
        category_id: categories[0]?.id ?? 0,
        name: '',
        description: '',
        price: 25000,
        badge: '',
        is_available: true,
        is_active: true,
        sort_order: 0,
        modifier_group_ids: [] as number[],
        image: null as File | null,
        remove_image: false,
    });

    const [recipeMenu, setRecipeMenu] = useState<MenuItemData | null>(null);
    const [recipeRows, setRecipeRows] = useState<
        Array<{ ingredient_id: number; quantity: string }>
    >([]);
    const [savingRecipe, setSavingRecipe] = useState(false);

    const applyFilters = (nextSearch: string, nextCat: string) => {
        router.get(
            '/admin/menus',
            {
                search: nextSearch || undefined,
                category_id: nextCat || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const openCreateMenu = () => {
        setEditingMenu(null);
        setFormState({
            category_id: categories[0]?.id ?? 0,
            name: '',
            description: '',
            price: 28000,
            badge: '',
            is_available: true,
            is_active: true,
            sort_order: menus.length + 1,
            modifier_group_ids: [],
            image: null,
            remove_image: false,
        });
        setMenuDialogOpen(true);
    };

    const openEditMenu = (item: MenuItemData) => {
        setEditingMenu(item);
        setFormState({
            category_id: item.category_id,
            name: item.name,
            description: item.description ?? '',
            price: item.price,
            badge: item.badge ?? '',
            is_available: item.is_available,
            is_active: item.is_active,
            sort_order: item.sort_order,
            modifier_group_ids: item.modifier_group_ids,
            image: null,
            remove_image: false,
        });
        setMenuDialogOpen(true);
    };

    const toggleModifierGroup = (groupId: number) => {
        setFormState((prev) => ({
            ...prev,
            modifier_group_ids: prev.modifier_group_ids.includes(groupId)
                ? prev.modifier_group_ids.filter((id) => id !== groupId)
                : [...prev.modifier_group_ids, groupId],
        }));
    };

    const submitMenu = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingMenu(true);

        const payload: Record<string, unknown> = {
            category_id: formState.category_id,
            name: formState.name,
            description: formState.description || null,
            price: formState.price,
            badge: formState.badge || null,
            is_available: formState.is_available,
            is_active: formState.is_active,
            sort_order: formState.sort_order,
            modifier_group_ids: formState.modifier_group_ids,
        };

        if (formState.image) {
            payload.image = formState.image;
        }
        if (editingMenu) {
            payload._method = 'put';
            payload.remove_image = formState.remove_image;
        }

        const targetUrl = editingMenu
            ? `/admin/menus/${editingMenu.id}`
            : '/admin/menus';

        router.post(targetUrl, payload as never, {
            forceFormData: true,
            onSuccess: () => setMenuDialogOpen(false),
            onFinish: () => setSubmittingMenu(false),
        });
    };

    const openRecipeEditor = (item: MenuItemData) => {
        setRecipeMenu(item);
        setRecipeRows(
            item.recipe_items.length > 0
                ? item.recipe_items.map((row) => ({
                      ingredient_id: row.ingredient_id,
                      quantity: String(row.quantity),
                  }))
                : ingredients[0]
                  ? [{ ingredient_id: ingredients[0].id, quantity: '1' }]
                  : [],
        );
    };

    const addRecipeRow = () => {
        const usedIds = new Set(recipeRows.map((r) => r.ingredient_id));
        const nextIng =
            ingredients.find((ing) => !usedIds.has(ing.id)) ?? ingredients[0];
        if (!nextIng) {
            return;
        }
        setRecipeRows((prev) => [
            ...prev,
            { ingredient_id: nextIng.id, quantity: '1' },
        ]);
    };

    const saveRecipe = (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipeMenu) {
            return;
        }
        setSavingRecipe(true);

        router.put(
            `/admin/menus/${recipeMenu.id}/recipe`,
            {
                ingredients: recipeRows.map((row) => ({
                    ingredient_id: row.ingredient_id,
                    quantity: Number(row.quantity),
                })),
            },
            {
                onSuccess: () => setRecipeMenu(null),
                onFinish: () => setSavingRecipe(false),
            },
        );
    };

    const previewCogs = recipeRows.reduce((sum, row) => {
        const ing = ingredients.find((i) => i.id === row.ingredient_id);
        const qty = Number(row.quantity) || 0;
        return sum + (ing ? qty * ing.cost_per_unit : 0);
    }, 0);
    const previewCogsRounded = Math.round(previewCogs);
    const previewPrice = recipeMenu?.price ?? 0;
    const previewProfit = previewPrice - previewCogsRounded;
    const previewMargin =
        previewPrice > 0
            ? Math.round((previewProfit / previewPrice) * 1000) / 10
            : 0;

    return (
        <>
            <Head title="Menu & Resep BOM" />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Katalog Menu & Resep BOM
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola harga jual, modifier, ketersediaan, serta HPP
                            dan Gross Margin berbasis resep.
                        </p>
                    </div>
                    <Button
                        onClick={openCreateMenu}
                        className="min-h-11 gap-2"
                        disabled={categories.length === 0}
                    >
                        <Plus className="size-4" />
                        Tambah Menu
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-64 flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                applyFilters(e.target.value, selectedCategory);
                            }}
                            placeholder="Cari nama menu..."
                            className="pl-9"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => {
                            setSelectedCategory(e.target.value);
                            applyFilters(search, e.target.value);
                        }}
                        className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    >
                        <option value="">Semua Kategori</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {menus.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs"
                        >
                            <div className="relative aspect-[4/3] w-full bg-secondary">
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <div className="flex size-full items-center justify-center text-muted-foreground">
                                        <Coffee className="size-12 opacity-40" />
                                    </div>
                                )}

                                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                    {item.badge === 'best_seller' && (
                                        <Badge className="bg-crema text-white">
                                            Best Seller
                                        </Badge>
                                    )}
                                    {item.badge === 'new' && (
                                        <Badge className="bg-espresso text-oat">
                                            New
                                        </Badge>
                                    )}
                                </div>

                                <div className="absolute top-3 right-3">
                                    <span
                                        className={cn(
                                            'rounded-full px-2.5 py-1 text-xs font-semibold shadow-xs',
                                            item.effective_available
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-red-700 text-white',
                                        )}
                                    >
                                        {item.effective_available
                                            ? 'Tersedia'
                                            : 'HABIS'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-1 flex-col gap-3 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {item.category_name}
                                        </p>
                                        <h2 className="text-base font-bold">
                                            {item.name}
                                        </h2>
                                    </div>
                                    <p className="font-money text-base font-bold text-primary">
                                        {formatRupiah(item.price)}
                                    </p>
                                </div>

                                {!item.effective_available &&
                                    item.unavailable_reason && (
                                        <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800">
                                            {item.unavailable_reason}
                                        </p>
                                    )}

                                <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-2.5 text-xs">
                                    <div>
                                        <p className="text-muted-foreground">
                                            HPP (BOM)
                                        </p>
                                        <p className="font-money font-semibold">
                                            {formatRupiah(item.cogs)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            Profit
                                        </p>
                                        <p className="font-money font-semibold">
                                            {formatRupiah(item.gross_profit)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            Margin
                                        </p>
                                        <p className="font-money font-semibold text-emerald-700">
                                            {item.gross_margin_percent}%
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 gap-1.5"
                                        onClick={() => openRecipeEditor(item)}
                                    >
                                        <FlaskConical className="size-3.5" />
                                        Resep ({item.recipe_items.length})
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            router.patch(
                                                `/admin/menus/${item.id}/toggle-availability`,
                                            )
                                        }
                                        title="Toggle Sold Out Manual"
                                    >
                                        <Power
                                            className={cn(
                                                'size-4',
                                                item.is_available
                                                    ? 'text-emerald-700'
                                                    : 'text-red-700',
                                            )}
                                        />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditMenu(item)}
                                    >
                                        <Edit2 className="size-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    `Hapus menu "${item.name}"?`,
                                                )
                                            ) {
                                                router.delete(
                                                    `/admin/menus/${item.id}`,
                                                );
                                            }
                                        }}
                                    >
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMenu ? 'Edit Menu' : 'Tambah Menu Baru'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitMenu} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="menu-cat">Kategori</Label>
                                <select
                                    id="menu-cat"
                                    value={formState.category_id}
                                    onChange={(e) =>
                                        setFormState((p) => ({
                                            ...p,
                                            category_id: Number(e.target.value),
                                        }))
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="menu-badge">Label</Label>
                                <select
                                    id="menu-badge"
                                    value={formState.badge}
                                    onChange={(e) =>
                                        setFormState((p) => ({
                                            ...p,
                                            badge: e.target.value,
                                        }))
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="">Tanpa Label</option>
                                    <option value="best_seller">
                                        Best Seller
                                    </option>
                                    <option value="new">New</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="menu-name">Nama Menu</Label>
                            <Input
                                id="menu-name"
                                value={formState.name}
                                onChange={(e) =>
                                    setFormState((p) => ({
                                        ...p,
                                        name: e.target.value,
                                    }))
                                }
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="menu-price">
                                    Harga Jual (Rp)
                                </Label>
                                <Input
                                    id="menu-price"
                                    type="number"
                                    min={0}
                                    value={formState.price}
                                    onChange={(e) =>
                                        setFormState((p) => ({
                                            ...p,
                                            price: Number(e.target.value),
                                        }))
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="menu-sort">Urutan</Label>
                                <Input
                                    id="menu-sort"
                                    type="number"
                                    min={0}
                                    value={formState.sort_order}
                                    onChange={(e) =>
                                        setFormState((p) => ({
                                            ...p,
                                            sort_order: Number(e.target.value),
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="menu-desc">Deskripsi</Label>
                            <textarea
                                id="menu-desc"
                                rows={2}
                                value={formState.description}
                                onChange={(e) =>
                                    setFormState((p) => ({
                                        ...p,
                                        description: e.target.value,
                                    }))
                                }
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="menu-image">
                                Foto Menu (4:3, maks 2MB)
                            </Label>
                            <Input
                                id="menu-image"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(e) =>
                                    setFormState((p) => ({
                                        ...p,
                                        image: e.target.files?.[0] ?? null,
                                    }))
                                }
                            />
                            {editingMenu?.image_url && (
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={formState.remove_image}
                                        onChange={(e) =>
                                            setFormState((p) => ({
                                                ...p,
                                                remove_image: e.target.checked,
                                            }))
                                        }
                                    />
                                    Hapus foto saat ini
                                </label>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Grup Modifier Terkait</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {modifierGroups.map((group) => (
                                    <label
                                        key={group.id}
                                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formState.modifier_group_ids.includes(
                                                group.id,
                                            )}
                                            onChange={() =>
                                                toggleModifierGroup(group.id)
                                            }
                                        />
                                        <span>{group.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={formState.is_available}
                                    onChange={(e) =>
                                        setFormState((p) => ({
                                            ...p,
                                            is_available: e.target.checked,
                                        }))
                                    }
                                />
                                Tersedia
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={formState.is_active}
                                    onChange={(e) =>
                                        setFormState((p) => ({
                                            ...p,
                                            is_active: e.target.checked,
                                        }))
                                    }
                                />
                                Aktif di Katalog
                            </label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMenuDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={submittingMenu}>
                                Simpan Menu
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={recipeMenu !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRecipeMenu(null);
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            Editor Resep BOM — {recipeMenu?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={saveRecipe} className="space-y-4">
                        <div className="grid grid-cols-3 gap-3 rounded-xl border bg-muted/50 p-3 text-xs">
                            <div>
                                <p className="text-muted-foreground">
                                    Harga Jual
                                </p>
                                <p className="font-money text-sm font-bold">
                                    {formatRupiah(previewPrice)}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">
                                    Estimasi HPP
                                </p>
                                <p className="font-money text-sm font-bold text-crema">
                                    {formatRupiah(previewCogsRounded)}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">
                                    Gross Margin
                                </p>
                                <p className="font-money text-sm font-bold text-emerald-700">
                                    {previewMargin}% (
                                    {formatRupiah(previewProfit)})
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            {recipeRows.map((row, index) => {
                                const ing = ingredients.find(
                                    (i) => i.id === row.ingredient_id,
                                );
                                return (
                                    <div
                                        key={`${index}-${row.ingredient_id}`}
                                        className="flex items-center gap-2"
                                    >
                                        <select
                                            value={row.ingredient_id}
                                            onChange={(e) => {
                                                const nextId = Number(
                                                    e.target.value,
                                                );
                                                setRecipeRows((prev) =>
                                                    prev.map((r, i) =>
                                                        i === index
                                                            ? {
                                                                  ...r,
                                                                  ingredient_id:
                                                                      nextId,
                                                              }
                                                            : r,
                                                    ),
                                                );
                                            }}
                                            className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            {ingredients.map((opt) => (
                                                <option
                                                    key={opt.id}
                                                    value={opt.id}
                                                >
                                                    {opt.name} ({opt.unit}) —{' '}
                                                    {formatRupiah(
                                                        opt.cost_per_unit,
                                                    )}
                                                    /{opt.unit}
                                                </option>
                                            ))}
                                        </select>
                                        <Input
                                            type="number"
                                            step="0.001"
                                            min="0.001"
                                            value={row.quantity}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setRecipeRows((prev) =>
                                                    prev.map((r, i) =>
                                                        i === index
                                                            ? {
                                                                  ...r,
                                                                  quantity: val,
                                                              }
                                                            : r,
                                                    ),
                                                );
                                            }}
                                            className="font-money w-28"
                                            required
                                        />
                                        <span className="w-8 text-xs text-muted-foreground">
                                            {ing?.unit ?? ''}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setRecipeRows((prev) =>
                                                    prev.filter(
                                                        (_, i) => i !== index,
                                                    ),
                                                )
                                            }
                                        >
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addRecipeRow}
                            className="gap-1.5"
                        >
                            <Plus className="size-4" />
                            Tambah Bahan Baku
                        </Button>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRecipeMenu(null)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={savingRecipe}>
                                Simpan Resep BOM
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
