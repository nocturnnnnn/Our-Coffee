import { Delete, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { jsonRequest } from '@/lib/http';

type PinExitModalProps = {
    open: boolean;
    onClose: () => void;
};

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function PinExitModal({ open, onClose }: PinExitModalProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleDigit = (digit: string) => {
        if (submitting || pin.length >= 6) {
            return;
        }
        setError(null);
        setPin((prev) => prev + digit);
    };

    const handleBackspace = () => {
        if (submitting) {
            return;
        }
        setError(null);
        setPin((prev) => prev.slice(0, -1));
    };

    const handleVerify = async () => {
        if (pin.length !== 6 || submitting) {
            return;
        }
        setSubmitting(true);
        setError(null);

        try {
            const res = await jsonRequest<{
                redirect?: string;
                message?: string;
            }>('/kiosk/exit', {
                method: 'POST',
                body: { pin },
            });

            if (res.ok && res.data.redirect) {
                window.location.href = res.data.redirect;
                return;
            }

            setError(res.data.message ?? 'PIN Admin tidak valid.');
            setPin('');
        } catch {
            setError('Gagal memverifikasi PIN.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setPin('');
            setError(null);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="size-5 text-primary" />
                        Keluar Mode Kiosk
                    </DialogTitle>
                    <DialogDescription>
                        Masukkan PIN Admin 6 digit untuk kembali ke halaman
                        login staf.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex justify-center gap-2.5 py-2">
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                            <div
                                key={idx}
                                className="font-money flex size-11 items-center justify-center rounded-xl border-2 border-border bg-muted text-xl font-bold"
                            >
                                {pin[idx] ? '•' : ''}
                            </div>
                        ))}
                    </div>

                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700">
                            {error}
                        </p>
                    )}

                    <div className="grid grid-cols-3 gap-2.5">
                        {KEYPAD.map((digit) => (
                            <Button
                                key={digit}
                                type="button"
                                variant="outline"
                                onClick={() => handleDigit(digit)}
                                className="font-money min-h-16 min-w-16 rounded-xl text-xl font-bold"
                            >
                                {digit}
                            </Button>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBackspace}
                            className="min-h-16 min-w-16 rounded-xl"
                            aria-label="Hapus digit"
                        >
                            <Delete className="size-6" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDigit('0')}
                            className="font-money min-h-16 min-w-16 rounded-xl text-xl font-bold"
                        >
                            0
                        </Button>
                        <Button
                            type="button"
                            disabled={pin.length !== 6 || submitting}
                            onClick={handleVerify}
                            className="min-h-16 min-w-16 rounded-xl text-sm font-bold"
                        >
                            Masuk
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
