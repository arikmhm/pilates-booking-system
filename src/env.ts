// Satu-satunya tempat membaca process.env. Gagal cepat dengan pesan jelas,
// bukan `undefined` yang meledak jauh di dalam driver.
// Tambahkan kunci baru di sini saat dipakai, bukan sebelumnya.

function wajib(nama: string): string {
  const nilai = process.env[nama];
  if (!nilai) throw new Error(`Env ${nama} belum diisi — lihat .env.example`);
  return nilai;
}

export const env = {
  get DATABASE_URL() {
    return wajib("DATABASE_URL");
  },
};
