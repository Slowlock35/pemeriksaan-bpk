/* Modul Ringkasan — View.
 * Model: data.json -> modul.ringkasan (indikator), basis.kategori (ubin kategori),
 *       timeline.json (peta jalan ringkas). Tidak ada blok terkunci. */
Halaman.daftar({
  id: "ringkasan",
  judul: "Ringkasan",
  ikon: "dasbor",
  render: function (H, p) {
    var d = H.blok("ringkasan");
    var fase = d.fase_aktif || {}, tenggat = d.tenggat_berikut || {}, gap = d.gap || {}, dok = d.dokumen || {};

    /* indikator: ikon di kiri, angka dan keterangan di kanan */
    var kpi = H.el("div", "kpi");
    function kartu(ikon, nada, judul, nilai, cat) {
      var k = H.el("div", "kpi__kartu");
      var i = H.el("div", "kpi__ikon kpi__ikon--" + nada);
      i.appendChild(H.ikon(ikon));
      k.appendChild(i);
      k.appendChild(H.el("div", "kpi__label", judul));
      k.appendChild(H.el("div", "kpi__nilai", nilai));
      k.appendChild(H.el("div", "kpi__cat", cat));
      kpi.appendChild(k);
    }
    kartu("bendera", "teal", "Fase saat ini", fase.no ? "Fase " + fase.no : "—",
          fase.nama ? fase.nama + " · s.d. " + H.tgl(fase.selesai) : "belum dimulai");
    kartu("jam", "amber", "Menuju tenggat", tenggat.hari != null ? tenggat.hari + " hari" : "—",
          tenggat.label || "tidak ada tenggat bertanggal");
    kartu("perisai", "merah", "Gap terbuka", String(H.jumlahGap(gap)),
          (gap.TINGGI || 0) + " tinggi · " + (gap.SEDANG || 0) + " sedang");
    kartu("map", "navy", "Dokumen terunggah", dok.dibaca_dari_drive === false ? "—" : String(dok.terunggah || 0),
          dok.dibaca_dari_drive === false ? "belum terbaca dari Drive"
            : "berkas di kamar Drive · target terukur pada " + (dok.terukur_pada || 0) + " dari " +
              (dok.total_kategori || 0) + " kategori");
    p.appendChild(kpi);

    p.appendChild(H.judul("Peta jalan", "jalur"));
    var ol = H.el("ol", "fase");
    ((H.keadaan.linimasa || {}).fase || []).forEach(function (f) { ol.appendChild(H.kartuFase(f, false)); });
    p.appendChild(ol);

    p.appendChild(H.judul("Kategori", "map"));
    var ubin = H.el("ul", "ubin");
    H.kategori().forEach(function (k) {
      var li = H.el("li");
      li.appendChild(H.el("div", "ubin__id", k.id));
      li.appendChild(H.el("div", "ubin__nama", k.nama));
      var bw = H.el("div", "ubin__bawah");
      bw.appendChild(H.stikel(H.label("kesiapan", k.kesiapan), H.nadaKesiapan(k.kesiapan)));
      var t = H.jumlahGap(k.gap);
      if (t) bw.appendChild(H.stikel(t + " gap", "terlambat", "peringatan"));
      li.appendChild(bw);
      ubin.appendChild(li);
    });
    p.appendChild(ubin);
  }
});
