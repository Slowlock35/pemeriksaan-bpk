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
    var ditunda = (H.blok("gap").ditunda || {}).jumlah || 0;      // gap fase berikutnya: belum dikerjakan

    /* pintu masuk unggah: pengguna yang datang untuk mengunggah langsung tahu ke mana harus pergi.
       (Bila tombol folder belum terbuka, pita di atas halaman sudah menjelaskan caranya.) */
    if (H.kunci("unggah")) {
      var aksi = H.el("div", "kartu kartu--lebar aksi-unggah");
      var teks = H.el("div");
      teks.appendChild(H.el("strong", null, "Ingin mengunggah dokumen?"));
      teks.appendChild(H.el("div", "aksi-unggah__ket", "Pilih kategori Anda, lalu tekan Buka folder kategori ini."));
      aksi.appendChild(teks);
      var tombol = H.el("button", "tombol tombol--utama", "Buka tab Unggah dokumen");
      tombol.type = "button";
      tombol.onclick = function () { H.bukaTab("unggah"); };
      aksi.appendChild(tombol);
      p.appendChild(aksi);
    }

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
          (gap.TINGGI || 0) + " tinggi · " + (gap.SEDANG || 0) + " sedang" + (ditunda ? " · " + ditunda + " untuk fase berikutnya" : ""));
    kartu("map", "navy", "Berkas di kamar Drive", dok.dibaca_dari_drive === false ? "—" : String(dok.terunggah || 0),
          dok.dibaca_dari_drive === false ? "belum terbaca dari Drive"
            : (dok.kamar_berisi || 0) + " dari " + (dok.total_kategori || 0) + " kategori sudah berisi berkas");
    p.appendChild(kpi);

    p.appendChild(H.judul("Peta jalan", "jalur"));
    var ol = H.el("ol", "fase");
    ((H.keadaan.linimasa || {}).fase || []).forEach(function (f) { ol.appendChild(H.kartuFase(f, false)); });
    p.appendChild(ol);
    var aturan = H.aturanFase(fase);       // aturan fase yang sedang berjalan (dari kalender)
    if (aturan) p.appendChild(aturan);

    /* ubin kategori bisa diklik (permintaan pemilik 24 Nov): badan ubin membuka kartu kategori itu di tab
       Unggah dokumen; tombol "N gap" langsung ke tab Gap yang sudah tersaring ke kategori itu */
    p.appendChild(H.judul("Kategori", "map"));
    var ubin = H.el("ul", "ubin");
    function keTab(id) {                     // pindah tab, lalu mulai dari atas isi tabnya
      H.bukaTab(id);
      var nav = document.getElementById("tabs");            // di ponsel bilah tab terpaku di bawah
      (getComputedStyle(nav).position === "fixed" ? document.getElementById("tab-" + id) : nav)
        .scrollIntoView({ block: "start", behavior: "instant" });
    }
    H.kategori().forEach(function (k) {
      var li = H.el("li", "ubin__item");

      var buka = H.el("button", "ubin__buka");
      buka.type = "button";
      buka.setAttribute("aria-label", "Buka kategori " + k.id + " " + k.nama + " di tab Unggah dokumen");
      var atas = H.el("div", "ubin__atas");
      atas.appendChild(H.el("span", "ubin__id", k.id));
      var panah = H.el("span", "ubin__panah");
      panah.appendChild(H.ikon("panah"));
      atas.appendChild(panah);
      buka.appendChild(atas);
      buka.appendChild(H.el("div", "ubin__nama", k.nama));
      buka.appendChild(H.stikel(H.label("kesiapan", k.kesiapan), H.nadaKesiapan(k.kesiapan)));
      buka.onclick = function () { H.keadaan.kategoriUnggah = k.id; H.renderUlang(); keTab("unggah"); };
      li.appendChild(buka);

      var t = H.jumlahGap(k.gap);
      if (t) {
        var g = H.el("button", "status status--terlambat status--ikon ubin__gap");
        g.type = "button";
        g.setAttribute("aria-label", "Lihat " + t + " gap kategori " + k.id + " " + k.nama + " di tab Gap");
        g.appendChild(H.ikon("peringatan"));
        g.appendChild(document.createTextNode(t + " gap"));
        g.appendChild(H.ikon("panah"));
        g.onclick = function () { H.keadaan.saring = k.id; H.renderUlang(); keTab("gap"); };
        var bw = H.el("div", "ubin__bawah");
        bw.appendChild(g);
        li.appendChild(bw);
      }
      ubin.appendChild(li);
    });
    p.appendChild(ubin);
  }
});
