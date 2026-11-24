/* Modul Lini masa — View.
 * Model: timeline.json (daftar fase) + basis.kategori di data.json (kemajuan per kategori).
 * Di ponsel tabel berubah menjadi kartu (gaya di style.css); judul tiap kolom dipakai sebagai
 * label kartu lewat data-label. Tidak ada blok terkunci. */
Halaman.daftar({
  id: "linimasa",
  judul: "Lini masa",
  ikon: "jalur",
  render: function (H, p) {
    p.appendChild(H.judul("Peta jalan tujuh fase", "jalur"));
    var ol = H.el("ol", "fase fase--rinci");
    ((H.keadaan.linimasa || {}).fase || []).forEach(function (f) { ol.appendChild(H.kartuFase(f, true)); });
    p.appendChild(ol);

    p.appendChild(H.judul("Kemajuan per kategori", "dasbor"));
    var dibaca = (H.blok("ringkasan").dokumen || {}).dibaca_dari_drive !== false;
    var gulir = H.el("div", "tabel-gulir");
    var t = H.el("table", "tabel");
    var cap = H.el("caption", "visually-hidden", "Kemajuan tiap kategori");
    t.appendChild(cap);
    var hr = H.el("tr");
    ["Kategori", "Kesiapan", "Penyampaian", "Penilaian BPK", "Dokumen", "Gap terbuka", "Tenggat"].forEach(function (h) {
      var th = H.el("th", null, h);
      th.scope = "col";
      hr.appendChild(th);
    });
    var kepala = H.el("thead");
    kepala.appendChild(hr);
    t.appendChild(kepala);
    var badan = H.el("tbody");

    function selDokumen(k) {
      var kotak = H.el("div"), d = k.dokumen || {};
      if (!dibaca) {                       // Drive tidak terbaca: tidak menampilkan 0 seolah hasil ukur
        kotak.appendChild(H.el("span", "bilah-hint", d.terukur
          ? "belum terbaca dari Drive · target " + H.ribuan(d.target) + " berkas" : "belum terbaca dari Drive"));
      } else if (d.terukur) {
        var target = d.target || 0, naik = d.terunggah || 0, persen = target ? Math.round(100 * naik / target) : 0;
        var bar = H.el("div", "bilah"), isi = H.el("div", "bilah__isi");
        isi.style.width = Math.min(100, persen) + "%";
        bar.appendChild(isi);
        kotak.appendChild(bar);
        kotak.appendChild(H.el("small", null, H.ribuan(naik) + " dari " + H.ribuan(target) + " berkas · " + persen + "%"));
      } else {
        kotak.appendChild(H.el("span", "bilah-hint", "belum terukur · " + (d.terunggah || 0) + " berkas"));
      }
      return H.sel(kotak, "angka", "Dokumen");
    }

    H.kategori().forEach(function (k) {
      var tr = H.el("tr");
      var td1 = H.el("td");
      td1.appendChild(H.el("span", "kode", k.id));
      td1.appendChild(H.el("div", null, k.nama));
      td1.appendChild(H.el("div", "bilah-hint", "Nomor BPK " + (k.nomor_bpk || "—")));
      tr.appendChild(H.sel(td1, "utama", ""));
      tr.appendChild(H.sel(H.stikel(H.label("kesiapan", k.kesiapan), H.nadaKesiapan(k.kesiapan)), "", "Kesiapan"));
      tr.appendChild(H.sel(H.label("penyampaian", k.penyampaian), "", "Penyampaian"));
      tr.appendChild(H.sel(H.label("penilaian", k.penilaian), "", "Penilaian BPK"));
      tr.appendChild(selDokumen(k));
      var bagian = H.rincianGap(k.gap);
      tr.appendChild(H.sel(bagian.length ? bagian.join(" · ") : "tidak ada", "", "Gap terbuka"));
      tr.appendChild(H.sel(H.tgl(k.tenggat), "", "Tenggat"));
      badan.appendChild(tr);
    });
    t.appendChild(badan);
    gulir.appendChild(t);
    p.appendChild(gulir);

    var catatan = H.el("p", "bilah-hint catatan-ukur");
    catatan.appendChild(H.ikon("info"));
    catatan.appendChild(document.createTextNode(" Terunggah = berkas di kamar Drive selain INDEKS. " +
      "Target = baris bernomor terbanyak pada satu lembar INDEKS kamar. \"Belum terukur\" berarti INDEKS " +
      "kamar itu belum memuat daftar bernomor."));
    p.appendChild(catatan);
  }
});
