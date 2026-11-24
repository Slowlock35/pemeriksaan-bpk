/* Modul Gap dan mitigasi — View.
 * Model terbuka (data.json -> modul.gap): jumlah gap per tingkat dan per kategori.
 * Model terkunci (locked.bin -> modul.gap): per gap — tingkat, status, dan ringkasan untuk tim.
 * Gap dikelompokkan menurut tingkatnya, tertinggi lebih dulu. */
Halaman.daftar({
  id: "gap",
  judul: "Gap dan mitigasi",
  ikon: "peringatan",
  lencana: function () { return Halaman.jumlahGap(Halaman.blok("gap").total); },
  render: function (H, p) {
    var saring = H.keadaan.saring || "SEMUA";
    var total = H.blok("gap").total || {};
    var buka = !!H.kunci("gap");

    p.appendChild(H.judul("Gap yang masih terbuka", "peringatan"));
    if (!buka) {
      var ringkas = H.el("div", "kartu kartu--lebar");
      ringkas.appendChild(H.el("div", "gap__meta", "Total: " + H.jumlahGap(total) + " gap · " +
        H.rincianGap(total).join(", ") + ". Rincianya hanya terbuka lewat tautan khusus."));
      p.appendChild(ringkas);
    } else {
      var chip = H.el("div", "saring"), jumlah = {};
      (H.kunci("gap").gaps || []).forEach(function (g) { jumlah[g.kategori] = (jumlah[g.kategori] || 0) + 1; });
      function tombol(teks, nilai) {
        var b = H.el("button", null, teks);
        b.type = "button";
        b.setAttribute("aria-pressed", saring === nilai ? "true" : "false");
        b.onclick = function () { H.keadaan.saring = nilai; H.renderUlang(); };
        chip.appendChild(b);
      }
      tombol("Semua", "SEMUA");
      H.kategori().concat([{ id: "LINTAS" }]).forEach(function (k) {
        if (jumlah[k.id]) tombol(H.namaKategori(k.id) + " · " + jumlah[k.id], k.id);
      });
      p.appendChild(chip);
    }

    var daftar = H.el("ul", "daftar-gap");
    if (!buka) {
      /* tanpa tautan khusus: hanya hitungan per kategori, tanpa rincian */
      H.kategori().forEach(function (k) {
        var bagian = H.rincianGap(k.gap);
        if (!bagian.length) return;
        var li = H.el("li", "gap"), i = H.el("div", "gap__ikon");
        li.dataset.tingkat = "TINGGI";
        i.appendChild(H.ikon("kunci"));
        li.appendChild(i);
        var isi = H.el("div", "gap__isi"), atas = H.el("div", "gap__atas");
        atas.appendChild(H.el("span", "kode", k.id));
        atas.appendChild(H.el("span", null, k.nama));
        isi.appendChild(atas);
        isi.appendChild(H.el("div", "gap__judul", H.jumlahGap(k.gap) + " gap terbuka: " + bagian.join(", ") + "."));
        li.appendChild(isi);
        daftar.appendChild(li);
      });
      if (!daftar.children.length) daftar.appendChild(H.kosong("Tidak ada gap terbuka yang tercatat.", "centang"));
    } else {
      var semua = (H.kunci("gap").gaps || []).filter(function (g) { return saring === "SEMUA" || g.kategori === saring; });
      H.tingkat.forEach(function (t) {
        var kelompok = semua.filter(function (g) { return g.tingkat === t; });
        if (!kelompok.length) return;
        var kepala = H.el("li", "gap__kelompok");
        kepala.appendChild(H.stikelTingkat(t));
        kepala.appendChild(H.el("span", null, kelompok.length + " gap"));
        daftar.appendChild(kepala);
        kelompok.sort(function (a, b) { return a.kategori < b.kategori ? -1 : 1; });
        kelompok.forEach(function (g) {
          var li = H.el("li", "gap"), i = H.el("div", "gap__ikon");
          li.dataset.tingkat = g.tingkat;
          i.appendChild(H.ikon((H.IKON.tingkat[g.tingkat] || H.IKON.tingkat.PERLU_VERIFIKASI)[0]));
          li.appendChild(i);
          var isi = H.el("div", "gap__isi"), atas = H.el("div", "gap__atas");
          atas.appendChild(H.el("span", "kode", H.namaKategori(g.kategori)));
          atas.appendChild(H.stikelTingkat(g.tingkat));
          atas.appendChild(H.stikel(H.label("gap", g.status), g.status === "SELESAI" ? "selesai" : "teal",
            g.status === "DIPERIKSA" ? "cari" : null));
          isi.appendChild(atas);
          var bagian = g.untuk_tim ? H.pecahRingkasan(g.untuk_tim) : null;
          isi.appendChild(H.el("div", "gap__judul", bagian ? bagian.keadaan
            : "Rincian temuan ini belum diringkas untuk tim; mohon disampaikan melalui PIC kategori " + H.namaKategori(g.kategori) + "."));
          if (bagian && bagian.tindakan) isi.appendChild(H.el("div", "gap__tindakan", bagian.tindakan));
          if (g.diperbarui) isi.appendChild(H.el("div", "bilah-hint", "Diperbarui " + H.tgl(g.diperbarui)));
          li.appendChild(isi);
          daftar.appendChild(li);
        });
      });
      if (!semua.length) daftar.appendChild(H.kosong("Tidak ada gap terbuka untuk saringan ini.", "centang"));
    }
    p.appendChild(daftar);
  }
});
