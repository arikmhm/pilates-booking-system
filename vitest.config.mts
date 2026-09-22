import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Test integrasi butuh DATABASE_URL. Vitest tidak memuat .env.local sendiri.
try {
  process.loadEnvFile(".env.local");
} catch {
  // di CI env sudah ada di environment
}

// Hanya 8 titik rawan (docs/04-flows.md bagian 9). Cakupan menyeluruh bukan tujuan.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts"],
    // Dua berkas test integrasi memakai SATU database lokal dan dua-duanya
    // TRUNCATE di beforeAll/afterAll. Dijalankan paralel, yang satu
    // menghapus fixture yang lain — gagalnya acak dan menyesatkan.
    // Seluruh suite ~1 detik, jadi harganya nol.
    fileParallelism: false,
  },
});
