type PromiseResolverPair<T> = {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
};

declare global {
    interface PromiseConstructor {
        withResolvers?<T>(): PromiseResolverPair<T>;
    }

    interface URLConstructor {
        parse?(input: string, base?: string | URL): URL | null;
    }
}

const ensurePromiseWithResolvers = () => {
    if (typeof Promise.withResolvers === 'function') return;

    Promise.withResolvers = function withResolvers<T>() {
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: unknown) => void;

        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        return { promise, resolve, reject };
    };
};

const ensureUrlParse = () => {
    if (typeof URL.parse === 'function') return;

    URL.parse = function parse(input: string, base?: string | URL) {
        try {
            return base ? new URL(input, base) : new URL(input);
        } catch {
            return null;
        }
    };
};

ensurePromiseWithResolvers();
ensureUrlParse();

export {};
