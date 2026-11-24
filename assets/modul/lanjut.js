/* Modul Tindak lanjut — View.
 * Model: data.json -> modul.lanjut. Sampai fase LHP dan tindak lanjut dimulai, data belum tersedia
 * dan modul menyatakannya dengan teks (bukan angka kosong). Tidak ada blok terkunci. */
Halaman.daftar({
  id: "lanjut",
  judul: "Tindak lanjut",
  ikon: "tindak-lanjut",
  render: function (H, p) {
    var t = H.blok("lanjut") || {};
    var k = H.el("div", "kartu kartu--lebar kosong-besar");
    var i = H.el("div", "kosong-besar__ikon");
    i.appendChild(H.ikon(t.tersedia ? "tindak-lanjut" : "jam"));
    k.appendChild(i);
    if (!t.tersedia) {
      k.appendChild(H.el("strong", null, "Belum ada data tindak lanjut"));
      k.appendChild(document.createTextNode("Bagian ini terisi saat fase LHP dan tindak lanjut dimulai. Tanggalnya mengikuti BPK."));
    } else {
      k.appendChild(H.el("strong", null, "Tindak lanjut"));
      k.appendChild(document.createTextNode(t.catatan || ""));
    }
    p.appendChild(k);
  }
});
