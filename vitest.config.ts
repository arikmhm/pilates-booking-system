import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Hanya 8 titik rawan (docs/04-flows.md bagian 9). Cakupan menyeluruh bukan tujuan.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts"],
    // src/rules/ masih kosong. Hapus baris ini begitu test pertama ditulis.
    passWithNoTests: true,
  },
});
