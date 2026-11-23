const rupiahFormatter = new Intl.NumberFormat('id-ID');

export function formatRupiah(amount: number): string {
    const absFormatted = rupiahFormatter.format(Math.abs(Math.trunc(amount)));

    return amount < 0 ? `-Rp ${absFormatted}` : `Rp ${absFormatted}`;
}

export function formatTimeWib(isoString: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date(isoString));
}

export function formatDateWib(isoString: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(isoString));
}
