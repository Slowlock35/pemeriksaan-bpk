/* Modul Unggah dokumen — View.
 * Model terbuka: basis.kategori di data.json (kemajuan, tenggat).
 * Model terkunci (locked.bin -> modul.unggah): PJ (penanggung jawab), anggota, validator, dan
 * tombol folder Drive per kategori, serta tombol folder induk (kembali ke Google Drive). Tautan folder
 * hanya muncul sebagai tombol di sini dan di kepala halaman.
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
      ["kunci", "Folder kamar sudah terbuka: siapa saja yang memiliki tautan dari halaman ini langsung bisa masuk dan mengunggah, tanpa meminta akses."],
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

    /* 1b) kembali ke Google Drive: folder induk yang memuat seluruh kamar kategori */
    var folderUtama = ((H.kunci("unggah") || {}).folder_utama || {}).folder_url;
    if (folderUtama) {
      var kembali = H.el("div", "kartu kartu--lebar aksi-unggah");
      var ket = H.el("div");
      ket.appendChild(H.el("strong", null, "Kembali ke Google Drive"));
      ket.appendChild(H.el("div", "aksi-unggah__ket", "Folder induk berisi seluruh kamar kategori."));
      kembali.appendChild(ket);
      var ka = H.el("a", "tombol tombol--sekunder", "Buka folder utama");
      ka.href = folderUtama;
      ka.target = "_blank";
      ka.rel = "noopener noreferrer";
      ka.appendChild(H.ikon("buka"));
      kembali.appendChild(ka);
      p.appendChild(kembali);
    }

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
        bw.appendChild(H.el("div", "bilah-hint", "Tautan kamar boleh diteruskan kepada tim. Bila tiba-tiba diminta akses, kabari PPK atau koordinator."));
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
      /* SSOT pemetaan gap berbasis risiko kamar (bila ada): ringkasan tingkat dari berkas SSOT di kamar —
         bukan hitungan bukti, dan bukan persen (satu baris SSOT belum tentu satu dokumen) */
      if (k.ssot_risiko && k.ssot_risiko.baris && k.ssot_risiko.baris.length) {
        var tampil = k.ssot_risiko.baris.slice(0, 3).map(function (r) {
          var teks = r[0] + ": " + (r[1] == null ? "?" : r[1]);
          if (r[5] != null) teks += " Tinggi dari " + r[5];
          if (r[2]) teks += " · " + r[2] + " Sedang";
          if (r[4]) teks += " · " + r[4] + " perlu verifikasi";
          return teks;
        });
        if (k.ssot_risiko.baris.length > 3) tampil.push("dan " + (k.ssot_risiko.baris.length - 3) + " baris lain di berkas SSOT kamar");
        baris("buka", "SSOT risiko kamar", tampil.join("; "));
      }
      baris("kalender", "Tenggat", H.tgl(k.tenggat));
      /* siapa mengerjakan apa: PJ (penanggung jawab), anggota/operator, validator checklist —
         semuanya dari peta register (keputusan pemilik 25 Nov 2026: PIC diganti PJ) */
      baris("orang", "PJ (penanggung jawab)", buka ? ((x.pj || []).join(", ") || "belum dipetakan") : "belum terbuka");
      baris("tim", "Anggota dan operator", buka ? ((x.anggota || []).join(", ") || "belum dipetakan") : "belum terbuka");
      /* pejabat alur (PPK, PPSPM, Bendahara, KPA) mengesahkan, bukan melaksanakan — ditayangkan terpisah,
         tidak dicampur ke anggota/operator (keputusan pemilik 25 Nov 2026, alur dokumen belanja 51).
         Kolom baru pada data: skrip lama mengabaikannya, skrip baru tanpa data itu tidak menampilkan baris ini. */
      if (buka && (x.pejabat || []).length) {
        baris("orang", "Pejabat alur (mengesahkan, bukan pelaksana)", x.pejabat.join(", "));
      }
      baris("mata", "Validator checklist", buka ? ((x.validator || []).join(", ") || "PPK") : "belum terbuka");
      c.appendChild(dl);
      grid.appendChild(c);
    });
    p.appendChild(grid);
  }
});
