import { create } from 'zustand';

export type KioskStep =
    | 'welcome'
    | 'order_type'
    | 'menu'
    | 'cart'
    | 'payment'
    | 'confirmation';

export type OrderTypeValue = 'dine_in' | 'takeaway';

export type KioskModifierOption = {
    id: number;
    name: string;
    price_delta: number;
    is_default: boolean;
};

export type KioskModifierGroup = {
    id: number;
    name: string;
    selection_type: 'single' | 'multiple';
    is_required: boolean;
    min_select: number;
    max_select: number;
    options: KioskModifierOption[];
};

export type KioskMenuItem = {
    id: number;
    category_id: number;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    badge: 'best_seller' | 'new' | null;
    is_available: boolean;
    unavailable_reason: string | null;
    max_servings: number | null;
    modifier_groups: KioskModifierGroup[];
};

export type KioskCategory = {
    id: number;
    name: string;
    icon: string | null;
    items: KioskMenuItem[];
};

export type KioskCartItem = {
    lineId: string;
    menuItemId: number;
    name: string;
    imageUrl: string | null;
    unitPrice: number;
    modifiersTotal: number;
    quantity: number;
    notes: string;
    selectedModifiers: Array<{
        optionId: number;
        groupName: string;
        optionName: string;
        priceDelta: number;
    }>;
};

type KioskCartState = {
    step: KioskStep;
    orderType: OrderTypeValue | null;
    customerName: string;
    items: KioskCartItem[];
    setStep: (step: KioskStep) => void;
    setOrderType: (orderType: OrderTypeValue) => void;
    setCustomerName: (name: string) => void;
    addOrUpdateItem: (
        item: Omit<KioskCartItem, 'lineId'> & { lineId?: string },
    ) => void;
    updateQuantity: (lineId: string, delta: number) => void;
    removeItem: (lineId: string) => void;
    removeItemsByMenuIds: (menuIds: number[]) => void;
    clearCart: () => void;
    resetSession: () => void;
};

function makeSignature(
    menuItemId: number,
    selectedModifiers: KioskCartItem['selectedModifiers'],
    notes: string,
): string {
    const modKey = selectedModifiers
        .map((m) => m.optionId)
        .sort((a, b) => a - b)
        .join(',');
    return `${menuItemId}|${modKey}|${notes.trim()}`;
}

export const useKioskCartStore = create<KioskCartState>((set) => ({
    step: 'welcome',
    orderType: null,
    customerName: '',
    items: [],

    setStep: (step) => set({ step }),
    setOrderType: (orderType) => set({ orderType }),
    setCustomerName: (customerName) => set({ customerName }),

    addOrUpdateItem: (incoming) =>
        set((state) => {
            if (incoming.lineId) {
                return {
                    items: state.items.map((item) =>
                        item.lineId === incoming.lineId
                            ? { ...incoming, lineId: incoming.lineId }
                            : item,
                    ),
                };
            }

            const sig = makeSignature(
                incoming.menuItemId,
                incoming.selectedModifiers,
                incoming.notes,
            );

            const existing = state.items.find(
                (item) =>
                    makeSignature(
                        item.menuItemId,
                        item.selectedModifiers,
                        item.notes,
                    ) === sig,
            );

            if (existing) {
                return {
                    items: state.items.map((item) =>
                        item.lineId === existing.lineId
                            ? {
                                  ...item,
                                  quantity: item.quantity + incoming.quantity,
                              }
                            : item,
                    ),
                };
            }

            const lineId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            return {
                items: [...state.items, { ...incoming, lineId }],
            };
        }),

    updateQuantity: (lineId, delta) =>
        set((state) => ({
            items: state.items
                .map((item) =>
                    item.lineId === lineId
                        ? { ...item, quantity: item.quantity + delta }
                        : item,
                )
                .filter((item) => item.quantity > 0),
        })),

    removeItem: (lineId) =>
        set((state) => ({
            items: state.items.filter((item) => item.lineId !== lineId),
        })),

    removeItemsByMenuIds: (menuIds) =>
        set((state) => ({
            items: state.items.filter(
                (item) => !menuIds.includes(item.menuItemId),
            ),
        })),

    clearCart: () => set({ items: [] }),

    resetSession: () =>
        set({
            step: 'welcome',
            orderType: null,
            customerName: '',
            items: [],
        }),
}));
