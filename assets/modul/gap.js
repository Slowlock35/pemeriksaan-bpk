/* Modul Gap dan mitigasi — View.
 * Model terbuka (data.json -> modul.gap): jumlah gap per tingkat dan per kategori, hitungan daftar kendali.
 * Model terkunci (locked.bin -> modul.gap): rincian gap dan butir daftar kendali yang batasnya terlewat.
 * Gap dikelompokkan menurut tingkatnya, tertinggi lebih dulu. */
Halaman.daftar({
  id: "gap",
  judul: "Gap dan mitigasi",
  ikon: "peringatan",
  lencana: function () { return Halaman.jumlahGap((Halaman.blok("gap").total)); },
  render: function (H, p) {
    var saring = H.keadaan.saring || "SEMUA";

    p.appendChild(H.judul("Gap yang masih terbuka", "peringatan"));
    var total = H.blok("gap").total || {};
    if (!H.kunci("gap")) {
      var ringkas = H.el("div", "kartu kartu--lebar");
      ringkas.appendChild(H.el("div", "gap__meta", "Total: " + H.jumlahGap(total) + " gap · " +
        H.rincianGap(total).join(", ") + ". Rincianya hanya terbuka lewat tautan khusus."));
      p.appendChild(ringkas);
    } else {
      var chip = H.el("div", "saring");
      var jumlah = {};
      (H.kunci("gap").gaps || []).forEach(function (g) { jumlah[g.kategori] = (jumlah[g.kategori] || 0) + 1; });
      function tombol(teks, nilai) {
        var b = H.el("button", null, teks);
        b.type = "button";
        b.setAttribute("aria-pressed", saring === nilai ? "true" : "false");
        b.onclick = function () { H.keadaan.saring = nilai; H.renderUlang(); };        chip.appendChild(b);
      }
      tombol("Semua", "SEMUA");
      H.kategori().concat([{ id: "LINTAS" }]).forEach(function (k) {
        if (jumlah[k.id]) tombol(H.namaKategori(k.id) + " · " + jumlah[k.id], k.id);
      });
      p.appendChild(chip);
    }

    var daftar = H.el("ul", "daftar-gap");
    if (!H.kunci("gap")) {
      H.kategori().forEach(function (k) {
        var bagian = H.rincianGap(k.gap);
        if (!bagian.length) return;
        var li = H.el("li", "gap");
        li.dataset.tingkat = "TINGGI";
        var i = H.el("div", "gap__ikon");
        i.appendChild(H.ikon("kunci"));
        li.appendChild(i);
        var isi = H.el("div", "gap__isi");
        var atas = H.el("div", "gap__atas");
        atas.appendChild(H.el("span", "kode", k.id));
        atas.appendChild(H.el("span", null, k.nama));
        isi.appendChild(atas);
        isi.appendChild(H.el("div", "gap__judul", H.jumlahGap(k.gap) + " gap terbuka: " + bagian.join(", ") + "."));
        li.appendChild(isi);
        daftar.appendChild(li);
      });
      if (!daftar.children.length) daftar.appendChild(H.kosong("Tidak ada gap terbuka yang tercatat di register.", "centang"));
      p.appendChild(daftar);
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
          var li = H.el("li", "gap");
          li.dataset.tingkat = g.tingkat;
          var i = H.el("div", "gap__ikon");
          i.appendChild(H.ikon((H.IKON.tingkat[g.tingkat] || H.IKON.tingkat.PERLU_VERIFIKASI)[0]));
          li.appendChild(i);
          var isi = H.el("div", "gap__isi");
          var atas = H.el("div", "gap__atas");
          atas.appendChild(H.el("span", "kode", H.namaKategori(g.kategori)));
          atas.appendChild(H.stikelTingkat(g.tingkat));
          atas.appendChild(H.stikel(H.label("gap", g.status), g.status === "SELESAI" ? "selesai" : "teal",
            g.status === "DIPERIKSA" ? "cari" : null));
          isi.appendChild(atas);
          isi.appendChild(H.el("div", "gap__judul", g.judul));
          if (g.pic) {
            var pj = H.el("div", "gap__meta");
            pj.appendChild(H.ikon("orang"));
            pj.appendChild(document.createTextNode(" Penangan: " + g.pic));
            isi.appendChild(pj);
          }
          if (g.mitigasi) {
            var mit = H.el("div", "gap__meta");
            mit.appendChild(H.ikon("kendali"));
            mit.appendChild(document.createTextNode(" Mitigasi: " + g.mitigasi));
            isi.appendChild(mit);
          }
          if (g.diperbarui) isi.appendChild(H.el("div", "bilah-hint", "Diperbarui " + H.tgl(g.diperbarui)));
          li.appendChild(isi);
          daftar.appendChild(li);
        });
      });
      if (!semua.length) daftar.appendChild(H.kosong("Tidak ada gap terbuka untuk saringan ini.", "centang"));
      p.appendChild(daftar);
    }

    p.appendChild(H.judul("Peringatan mitigasi", "kendali"));
    var m = H.blok("gap").kendali || {}, k = H.el("div", "kartu kartu--lebar kendali");
    [["lewat_tenggat", "Batas internal terlewat", "jam", "amber"], ["belum_dinilai", "Belum dinilai", "bantuan", "navy"],
     ["total", "Butir daftar kendali", "daftar", "teal"], ["selesai", "Sudah selesai", "centang", "teal"]]
      .forEach(function (b) {
        var baris = H.el("div", "kendali__baris");
        var i = H.el("div", "kpi__ikon kpi__ikon--" + b[3]);
        i.appendChild(H.ikon(b[2]));
        baris.appendChild(i);
        baris.appendChild(H.el("div", null, b[1] + ": " + (m[b[0]] || 0)));
        k.appendChild(baris);
      });
    var petunjuk = H.el("div", "bilah-hint kendali__petunjuk");
    petunjuk.appendChild(H.ikon("info"));
    petunjuk.appendChild(document.createTextNode(" Belum dinilai berarti buktinya belum diperiksa, bukan berarti tidak dikerjakan."));
    k.appendChild(petunjuk);
    p.appendChild(k);

    var w = H.el("ul", "daftar-gap");
    if (!H.kunci("gap")) {
      w.appendChild(H.kosong("Rincian butir terkunci.", "kunci"));
    } else {
      var lewat = H.kunci("gap").kendala_lewat || [];
      if (!lewat.length) w.appendChild(H.kosong("Tidak ada butir yang batas internalnya terlewat.", "centang"));
      lewat.forEach(function (b) {
        var li = H.el("li", "gap");
        li.dataset.tingkat = "SEDANG";
        var i = H.el("div", "gap__ikon");
        i.appendChild(H.ikon("jam"));
        li.appendChild(i);
        var isi = H.el("div", "gap__isi");
        var atas = H.el("div", "gap__atas");
        atas.appendChild(H.stikel("Batas " + H.tgl(b.tenggat), "terlambat"));
        if (b.status) atas.appendChild(H.stikel(b.status, "rencana"));
        isi.appendChild(atas);
        isi.appendChild(H.el("div", "gap__judul", b.tindakan));
        if (b.peran) {
          var peran = H.el("div", "gap__meta");
          peran.appendChild(H.ikon("orang"));
          peran.appendChild(document.createTextNode(" Peran: " + b.peran));
          isi.appendChild(peran);
        }
        li.appendChild(isi);
        w.appendChild(li);
      });
    }
    p.appendChild(w);
  }
});
