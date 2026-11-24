/* Modul Unggah dokumen — View.
 * Model terbuka: basis.kategori di data.json (kemajuan, tenggat).
 * Model terkunci (locked.bin -> modul.unggah): penanggung jawab, PIC bidang terkait, penelaah, dan
 * tombol folder Drive per kategori. Tautan folder hanya muncul sebagai tombol di sini.
 * Jalur pengguna dibuat sesingkat mungkin: pilih kategorinya → tekan satu tombol → tiba di folder. */
Halaman.daftar({
  id: "unggah",
  judul: "Unggah dokumen",
  ikon: "unggah",
  render: function (H, p) {
    var buka = !!H.kunci("unggah");
    var pilih = H.keadaan.kategoriUnggah || "SEMUA";

    /* 1) langkah singkat — berbeda menurut apakah tombol folder sudah terbuka */
    var cara = H.el("div", "kartu kartu--lebar langkah");
    var kepala = H.el("strong", "langkah__judul");
    kepala.appendChild(H.ikon("daftar"));
    kepala.appendChild(document.createTextNode(buka ? "Tiga langkah mengunggah" : "Cara membuka folder"));
    cara.appendChild(kepala);
    var ol = H.el("ol");
    var langkah = buka ? [
      ["dasbor", "Pilih kategori Anda dengan tombol di bawah, lalu tekan Buka folder kategori ini."],
      ["kunci", "Bila Drive meminta akses, tekan Request access lalu kirim. Cukup sekali; PPK menyetujui."],
      ["berkas", "Unggah satu dokumen satu berkas, lalu catat tautannya di berkas INDEKS di folder itu."]]
      : [
      ["kunci", "Buka halaman ini lewat tautan pada pesan grup WAG. Tombol folder akan muncul dengan sendirinya."],
      ["map", "Pilih kategori Anda, lalu tekan Buka folder kategori ini."],
      ["berkas", "Unggah satu dokumen satu berkas, lalu catat tautannya di berkas INDEKS di folder itu."]];
    langkah.forEach(function (l) {
      var li = H.el("li");
      var i = H.el("span", "langkah__ikon");
      i.appendChild(H.ikon(l[0]));
      li.appendChild(i);
      li.appendChild(H.el("span", null, l[1]));
      ol.appendChild(li);
    });
    cara.appendChild(ol);
    p.appendChild(cara);

    /* 2) pemilih kategori: satu sentuhan untuk menampilkan kamar sendiri saja */
    var terkunci = {}, dibaca = (H.blok("ringkasan").dokumen || {}).dibaca_dari_drive !== false;
    ((H.kunci("unggah") || {}).kategori || []).forEach(function (x) { terkunci[x.id] = x; });
    if (buka) {
      var chip = H.el("div", "saring saring--kategori");
      chip.setAttribute("role", "group");
      chip.setAttribute("aria-label", "Pilih kategori");
      function tombol(teks, nilai) {
        var b = H.el("button", null, teks);
        b.type = "button";
        b.setAttribute("aria-pressed", pilih === nilai ? "true" : "false");
        b.onclick = function () {
          H.keadaan.kategoriUnggah = nilai;
          H.renderUlang();
          document.getElementById("tab-unggah").scrollIntoView({ block: "start", behavior: "instant" });
        };
        chip.appendChild(b);
      }
      tombol("Semua", "SEMUA");
      H.kategori().forEach(function (k) { tombol(k.id, k.id); });
      p.appendChild(chip);
    }

    /* 3) kartu kategori */
    var grid = H.el("div", "kartu-grid");
    H.kategori().forEach(function (k) {
      if (pilih !== "SEMUA" && pilih !== k.id) return;
      var x = terkunci[k.id] || {}, dkk = k.dokumen || {};
      var c = H.el("article", "kartu kartu-unggah");
      c.appendChild(H.el("span", "kode", k.id + " · Nomor BPK " + (k.nomor_bpk || "—")));
      c.appendChild(H.el("h3", null, k.nama));
      var status = H.el("div");
      status.appendChild(H.stikel(H.label("kesiapan", k.kesiapan), H.nadaKesiapan(k.kesiapan)));
      c.appendChild(status);

      /* tombol folder diletakkan paling atas kartu: tindakan utama harus terlihat tanpa menggulir */
      var bw = H.el("div", "kartu-unggah__bawah");
      if (x.folder_url) {
        var a = H.el("a", "tombol tombol--utama");
        a.href = x.folder_url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.appendChild(H.ikon("buka"));
        a.appendChild(document.createTextNode("Buka folder kategori ini"));
        bw.appendChild(a);
        bw.appendChild(H.el("div", "bilah-hint", "Bila muncul \"You need access\", tekan Request access lalu kirim; PPK menyetujui."));
      } else {
        var b = H.el("button", "tombol tombol--sekunder", buka ? "Tautan folder belum tersedia" : "Tombol folder terbuka lewat tautan grup WAG");
        b.type = "button";
        b.disabled = true;
        bw.appendChild(b);
      }
      c.appendChild(bw);

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
      grid.appendChild(c);
    });
    p.appendChild(grid);
  }
});
