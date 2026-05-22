// SSR shim: the auto-generated Supabase client references `localStorage`
// at module-eval time. Define a no-op storage during SSR so the import
// doesn't throw. Real localStorage replaces this on the client.
if (typeof globalThis.localStorage === "undefined") {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
    clear: () => { mem.clear(); },
    key: (i: number) => Array.from(mem.keys())[i] ?? null,
    get length() { return mem.size; },
  };
}
export {};
