export type JsonResponseResult<T> = {
    ok: boolean;
    status: number;
    data: T;
};

function getCsrfToken(): string {
    if (typeof document === 'undefined') {
        return '';
    }

    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content') ?? '';
}

export async function jsonRequest<T>(
    url: string,
    options?: {
        method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        body?: unknown;
    },
): Promise<JsonResponseResult<T>> {
    const method = options?.method ?? 'GET';
    const headers: Record<string, string> = {
        Accept: 'application/json',
    };

    if (method !== 'GET') {
        headers['Content-Type'] = 'application/json';
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            headers['X-CSRF-TOKEN'] = csrfToken;
        }
    }

    const response = await fetch(url, {
        method,
        headers,
        credentials: 'same-origin',
        body:
            options?.body !== undefined
                ? JSON.stringify(options.body)
                : undefined,
    });

    const data = (await response.json()) as T;

    return {
        ok: response.ok,
        status: response.status,
        data,
    };
}
