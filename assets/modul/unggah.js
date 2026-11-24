/* Modul Unggah dokumen — View.
 * Model terbuka: basis.kategori di data.json (kemajuan, tenggat).
 * Model terkunci (locked.bin -> modul.unggah): penanggung jawab, PIC bidang terkait, penelaah, dan
 * tombol folder Drive per kategori. Tautan folder hanya muncul sebagai tombol di sini. */
Halaman.daftar({
  id: "unggah",
  judul: "Unggah dokumen",
  ikon: "unggah",
  render: function (H, p) {
    /* cara mengunggah: tiga langkah, ikon di kiri tiap langkah */
    var cara = H.el("div", "kartu kartu--lebar langkah");
    var kepala = H.el("strong", "langkah__judul");
    kepala.appendChild(H.ikon("daftar"));
    kepala.appendChild(document.createTextNode(" Cara mengunggah"));
    cara.appendChild(kepala);
    var ol = H.el("ol");
    [["map", "Buka folder kategori Anda dengan tombol pada kartu di bawah."],
     ["kunci", "Bila belum bisa membukanya, pilih Request access; PPK menyetujui sesuai peran."],
     ["berkas", "Unggah satu dokumen satu berkas, lalu catat tautannya di berkas INDEKS di folder itu."]]
      .forEach(function (l) {
        var li = H.el("li");
        var i = H.el("span", "langkah__ikon");
        i.appendChild(H.ikon(l[0]));
        li.appendChild(i);
        li.appendChild(H.el("span", null, l[1]));
        ol.appendChild(li);
      });
    cara.appendChild(ol);
    p.appendChild(cara);

    var terkunci = {}, buka = !!H.kunci("unggah"), dibaca = (H.blok("ringkasan").dokumen || {}).dibaca_dari_drive !== false;
    ((H.kunci("unggah") || {}).kategori || []).forEach(function (x) { terkunci[x.id] = x; });

    var grid = H.el("div", "kartu-grid");
    H.kategori().forEach(function (k) {
      var x = terkunci[k.id] || {}, dkk = k.dokumen || {};
      var c = H.el("article", "kartu kartu-unggah");
      c.appendChild(H.el("span", "kode", k.id + " · Nomor BPK " + (k.nomor_bpk || "—")));
      c.appendChild(H.el("h3", null, k.nama));
      var status = H.el("div");
      status.appendChild(H.stikel(H.label("kesiapan", k.kesiapan), H.nadaKesiapan(k.kesiapan)));
      c.appendChild(status);

      var dl = H.el("dl");
      function baris(ikonNama, judul, isi) {
        var dt = H.el("dt");
        dt.appendChild(H.ikon(ikonNama));
        dt.appendChild(document.createTextNode(judul));
        dl.appendChild(dt);
        dl.appendChild(H.el("dd", null, isi));
      }
      baris("berkas", "Berkas di kamar", H.teksDokumen(dkk, dibaca));
      baris("kalender", "Tenggat", H.tgl(k.tenggat));
      baris("orang", "Penanggung jawab", buka ? (x.penanggung_jawab || "belum ditetapkan") : "belum terbuka");
      baris("tim", "PIC bidang terkait", buka ? ((x.pic_bidang || []).join(", ") || "belum dipetakan") : "belum terbuka");
      baris("mata", "Menelaah", buka ? ((x.penelaah || []).join(", ") || "PPK") : "belum terbuka");
      c.appendChild(dl);

      var bw = H.el("div", "kartu-unggah__bawah");
      if (x.folder_url) {
        var a = H.el("a", "tombol tombol--utama");
        a.href = x.folder_url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.appendChild(H.ikon("buka"));
        a.appendChild(document.createTextNode("Buka folder kategori ini"));
        bw.appendChild(a);
      } else {
        var b = H.el("button", "tombol tombol--sekunder", buka ? "Tautan folder belum tersedia" : "Belum terbuka · butuh tautan khusus");
        b.type = "button";
        b.disabled = true;
        bw.appendChild(b);
      }
      c.appendChild(bw);
      grid.appendChild(c);
    });
    p.appendChild(grid);
  }
});
