import { Delete, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SupervisorPinModalProps = {
    open: boolean;
    mode: 'discount' | 'void';
    maxDiscount?: number;
    errorMessage?: string | null;
    submitting?: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        pin: string;
        reason: string;
        discountAmount?: number;
    }) => void;
};

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function SupervisorPinModal({
    open,
    mode,
    maxDiscount = 0,
    errorMessage,
    submitting = false,
    onClose,
    onConfirm,
}: SupervisorPinModalProps) {
    const [pin, setPin] = useState('');
    const [reason, setReason] = useState('');
    const [discountAmount, setDiscountAmount] = useState('');

    const resetAndClose = () => {
        setPin('');
        setReason('');
        setDiscountAmount('');
        onClose();
    };

    const handleSubmit = () => {
        if (pin.length !== 6 || !reason.trim()) {
            return;
        }
        onConfirm({
            pin,
            reason: reason.trim(),
            discountAmount:
                mode === 'discount'
                    ? Math.max(
                          0,
                          Math.min(maxDiscount, Number(discountAmount) || 0),
                      )
                    : undefined,
        });
    };

    const canSubmit =
        pin.length === 6 &&
        reason.trim().length > 0 &&
        (mode !== 'discount' || (Number(discountAmount) || 0) > 0) &&
        !submitting;

    return (
        <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="size-5 text-primary" />
                        {mode === 'void'
                            ? 'Otorisasi Void Pesanan'
                            : 'Otorisasi Diskon Manual'}
                    </DialogTitle>
                    <DialogDescription>
                        Wajib menyertakan alasan dan PIN Supervisor/Admin 6
                        digit.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {mode === 'discount' && (
                        <div className="space-y-1.5">
                            <Label htmlFor="sup-discount">
                                Nominal Diskon (Rp, maks{' '}
                                {maxDiscount.toLocaleString('id-ID')})
                            </Label>
                            <Input
                                id="sup-discount"
                                type="number"
                                min={1}
                                max={maxDiscount}
                                value={discountAmount}
                                onChange={(e) =>
                                    setDiscountAmount(e.target.value)
                                }
                                placeholder="Contoh: 10000"
                                className="font-money h-12"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="sup-reason">
                            {mode === 'void' ? 'Alasan Void' : 'Alasan Diskon'}
                        </Label>
                        <Input
                            id="sup-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={
                                mode === 'void'
                                    ? 'Contoh: Pelanggan salah pesan'
                                    : 'Contoh: Promo karyawan / kompensasi'
                            }
                            className="h-12"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>PIN Admin 6 Digit</Label>
                        <div className="flex justify-center gap-2">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="font-money flex size-10 items-center justify-center rounded-xl border-2 bg-muted text-lg font-bold"
                                >
                                    {pin[i] ? '•' : ''}
                                </div>
                            ))}
                        </div>
                    </div>

                    {errorMessage && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700">
                            {errorMessage}
                        </p>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                        {PAD.map((digit) => (
                            <Button
                                key={digit}
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setPin((p) =>
                                        p.length < 6 ? p + digit : p,
                                    )
                                }
                                className="font-money min-h-[60px] min-w-[60px] rounded-xl text-lg font-bold"
                            >
                                {digit}
                            </Button>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPin((p) => p.slice(0, -1))}
                            className="min-h-[60px] min-w-[60px] rounded-xl"
                            aria-label="Hapus digit"
                        >
                            <Delete className="size-5" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setPin((p) => (p.length < 6 ? `${p}0` : p))
                            }
                            className="font-money min-h-[60px] min-w-[60px] rounded-xl text-lg font-bold"
                        >
                            0
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setPin('')}
                            className="min-h-[60px] min-w-[60px] rounded-xl text-xs"
                        >
                            Reset
                        </Button>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={resetAndClose}
                        className="min-h-12"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        disabled={!canSubmit}
                        onClick={handleSubmit}
                        className="min-h-12 font-bold"
                    >
                        {submitting
                            ? 'Memverifikasi...'
                            : 'Konfirmasi Otorisasi'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
