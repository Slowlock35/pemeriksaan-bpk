/* Monitoring Evaluasi Pemeriksaan BPK — inti halaman (Controller).
 *
 * Arsitektur MVC (docs/page/rancangan-modular-dmaic.md):
 *   Model       data.json, timeline.json, locked.bin — dibangun dari register oleh
 *               scripts/auditlib/page_modul (satu modul = satu blok data).
 *   View        assets/modul/*.js — tiap berkas satu modul yang mendaftarkan diri lewat
 *               Halaman.daftar({ id, judul, ikon, render }).
 *   Controller  berkas ini — memuat data, membuka bagian terkunci, mengatur tab, dan
 *               memanggil render tiap modul. Ia tidak tahu isi modul.
 *
 * Halaman hanya menampilkan hasil sinkronisasi; tidak ada cara mengubah status dari sini.
 * Bagian terkunci (locked.bin) dienkripsi AES-GCM dengan kunci turunan token pada tautan. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var BERKAS_KUNCI = "locked.bin";
  var KUNCI_SIMPAN = "halaman-bpk.tautan";   // tautan yang tersimpan di peramban setelah berhasil dibuka sekali
  /* Versi bentuk data yang dipahami skrip ini. Harus sama dengan page_modul.BENTUK (Python):
     peramban menyimpan skrip lama, dan skrip lama yang menerima data bentuk baru tampil kacau. */
  var BENTUK = 6;
  var TINGKAT = ["TINGGI", "SEDANG", "RENDAH", "PERLU_VERIFIKASI"];
  var BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  /* Istilah status register -> bahasa tim. Warna bukan satu-satunya penanda. */
  var KAMUS = {
    kesiapan: {
      NOT_ASSESSED: "Belum dinilai", COLLECTING: "Dokumen dikumpulkan", PARTIAL: "Sebagian",
      READY_FOR_REVIEW: "Siap ditelaah", VERIFIED: "Terverifikasi", REOPENED: "Dibuka kembali",
      RECHECK_REQUIRED: "Perlu diperiksa ulang"
    },
    penyampaian: {
      UNKNOWN: "Belum diketahui", NOT_SENT_CONFIRMED: "Belum dikirim", PARTIALLY_SENT: "Sebagian terkirim",
      SENT: "Terkirim", RECEIPT_RECORDED: "Tanda terima tercatat"
    },
    penilaian: { NOT_ASSESSED_BY_BPK: "Belum dinilai BPK" },
    gap: { OPEN: "Terbuka", DIPERIKSA: "Sedang diperiksa", SELESAI: "Selesai", DITUTUP: "Ditutup" },
    fase: { berjalan: "Sedang berjalan", direncanakan: "Direncanakan", selesai: "Selesai", belum_dijadwalkan: "Mengikuti BPK" },
    tingkat: { TINGGI: "Tinggi", SEDANG: "Sedang", RENDAH: "Rendah", PERLU_VERIFIKASI: "Perlu verifikasi" }
  };

  /* Ikon kontekstual: [nama ikon, nada warna] atau nama ikon. */
  var IKON = {
    tingkat: { TINGGI: ["peringatan", "terlambat"], SEDANG: ["lingkaran-seru", "jalan"],
               RENDAH: ["info", "selesai"], PERLU_VERIFIKASI: ["bantuan", "rencana"] },
    fase_status: { berjalan: "jam", direncanakan: "kalender", selesai: "centang", belum_dijadwalkan: "bantuan" },
    fase_no: { 1: "daftar", 2: "papan-periksa", 3: "segarkan", 4: "cari", 5: "pesan", 6: "dokumen-teks", 7: "arsip" },
    kesiapan: { NOT_ASSESSED: "bantuan", COLLECTING: "unggah", PARTIAL: "lingkaran-seru", READY_FOR_REVIEW: "mata",
                VERIFIED: "centang", REOPENED: "peringatan", RECHECK_REQUIRED: "cari" }
  };

  /* ---------- alat bantu ---------- */
  function $(sel) { return document.querySelector(sel); }

  function el(tag, cls, teks) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (teks != null) n.textContent = teks;
    return n;
  }

  function ikon(nama, cls) {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("class", "ikon" + (cls ? " " + cls : ""));
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    var u = document.createElementNS(NS, "use");
    u.setAttribute("href", "#i-" + nama);
    s.appendChild(u);
    return s;
  }

  function ribuan(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  function tgl(iso) {
    if (!iso) return "belum dijadwalkan";
    var p = iso.split("-");
    return p.length === 3 ? parseInt(p[2], 10) + " " + BULAN[parseInt(p[1], 10) - 1] + " " + p[0] : iso;
  }

  function label(grup, kode) { return (KAMUS[grup] || {})[kode] || kode; }

  function namaKategori(k) { return k === "LINTAS" ? "Lintas kategori" : k; }

  function nadaKesiapan(status) {
    return { NOT_ASSESSED: "rencana", COLLECTING: "jalan", PARTIAL: "jalan", READY_FOR_REVIEW: "teal",
             VERIFIED: "selesai", REOPENED: "terlambat", RECHECK_REQUIRED: "emas" }[status] || "rencana";
  }

  function stikel(teks, nada, ikonNama) {
    var s = el("span", "status" + (nada ? " status--" + nada : "") + (ikonNama ? " status--ikon" : ""));
    if (ikonNama) s.appendChild(ikon(ikonNama));
    s.appendChild(document.createTextNode(teks));
    return s;
  }

  function stikelTingkat(t) {
    var p = IKON.tingkat[t] || IKON.tingkat.PERLU_VERIFIKASI;
    return stikel(KAMUS.tingkat[t] || t, p[1], p[0]);
  }

  function judul(teks, ikonNama) {
    var h = el("h2", "judul-bagian");
    if (ikonNama) h.appendChild(ikon(ikonNama));
    h.appendChild(document.createTextNode(teks));
    return h;
  }

  function kosong(teks, ikonNama) {
    var li = el("li", "kosong");
    if (ikonNama) li.appendChild(ikon(ikonNama));
    li.appendChild(document.createTextNode(teks));
    return li;
  }

  /* Sel tabel; `label` dipakai sebagai judul saat tabel berubah menjadi kartu di ponsel. */
  function sel(anak, cls, labelKartu) {
    var td = el("td", cls);
    if (labelKartu) td.dataset.label = labelKartu;
    td.appendChild(typeof anak === "string" ? document.createTextNode(anak) : anak);
    return td;
  }

  function jumlahGap(g) {
    g = g || {};
    var t = 0;
    TINGKAT.forEach(function (x) { t += g[x] || 0; });
    return t;
  }

  function rincianGap(g) {
    var bagian = [];
    TINGKAT.forEach(function (x) { if (g && g[x]) bagian.push(g[x] + " " + KAMUS.tingkat[x].toLowerCase()); });
    return bagian;
  }

  /* Ringkasan untuk tim: kalimat pertama = keadaan, sisanya = tindakan / penangguhan keputusan. */
  function pecahRingkasan(t) {
    var i = t.indexOf(". ");
    return i < 0 ? { keadaan: t, tindakan: "" } : { keadaan: t.slice(0, i + 1), tindakan: t.slice(i + 2) };
  }

  function ambilJson(url) {
    return fetch(url + "?v=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url + " (" + r.status + ")");
      return r.json();
    });
  }

  /* ---------- kartu fase (dipakai modul Ringkasan dan Lini masa) ---------- */
  function kartuFase(f, rinci) {
    var li = el("li");
    li.dataset.status = f.status;
    var kepala = el("div", "fase__kepala");
    kepala.appendChild(el("span", "fase__no", (f.no < 10 ? "0" : "") + f.no));
    kepala.appendChild(ikon(IKON.fase_no[f.no] || "bendera", "fase__ikon"));
    li.appendChild(kepala);
    li.appendChild(el("span", "fase__nama", f.nama));
    var waktu = f.mulai
      ? (f.selesai && f.selesai !== f.mulai ? tgl(f.mulai) + " – " + tgl(f.selesai) : tgl(f.mulai))
      : (f.ket_waktu || "belum dijadwalkan");
    li.appendChild(el("span", "fase__waktu", waktu));
    if (f.status === "belum_dijadwalkan") {
      if (!rinci) li.appendChild(el("span", "fase__ket", "Mengikuti BPK"));   // tampilan rinci memakai stikel
    } else if (f.ket_waktu) li.appendChild(el("span", "fase__ket", f.ket_waktu));
    if (rinci && f.uraian) li.appendChild(el("span", "fase__uraian", f.uraian));
    if (rinci) {
      li.appendChild(el("div", "fase__status"));
      li.lastChild.appendChild(stikel(label("fase", f.status), f.status === "berjalan" ? "teal" : f.status === "selesai" ? "selesai" : "rencana", IKON.fase_status[f.status]));
    }
    return li;
  }

  /* Aturan main fase yang sedang berjalan — teksnya dari kalender register (mis. batas fase
     pengumpulan dokumen dan arti gapnya), bukan teks tetap di halaman. */
  function aturanFase(f) {
    if (!f || f.status !== "berjalan" || !f.ket) return null;
    var k = el("div", "kartu kartu--lebar aturan-fase");
    var h = el("strong", "aturan-fase__judul");
    h.appendChild(ikon("daftar"));
    h.appendChild(document.createTextNode("Aturan Fase " + f.no + " — " + f.nama));
    k.appendChild(h);
    k.appendChild(el("div", "aturan-fase__isi", f.ket));
    return k;
  }

  /* ---------- pembuka bagian terkunci ----------
   * Berkas: "BPKL" (4) · versi (1) · jumlah ulang PBKDF2 (4, big-endian) · garam (16) · iv (12) · isi terenkripsi. */
  function bukaKunci(token, buf) {
    var dv = new DataView(buf);
    var magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
    if (magic !== "BPKL" || dv.getUint8(4) !== 1) throw new Error("format");
    var ulang = dv.getUint32(5);
    var garam = new Uint8Array(buf, 9, 16);
    var iv = new Uint8Array(buf, 25, 12);
    var isi = new Uint8Array(buf, 37);
    var subtle = window.crypto.subtle;
    return subtle.importKey("raw", new TextEncoder().encode(token), "PBKDF2", false, ["deriveKey"])
      .then(function (bahan) {
        return subtle.deriveKey(
          { name: "PBKDF2", salt: garam, iterations: ulang, hash: "SHA-256" }, bahan,
          { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      })
      .then(function (k) { return subtle.decrypt({ name: "AES-GCM", iv: iv }, k, isi); })
      .then(function (terang) { return JSON.parse(new TextDecoder("utf-8").decode(terang)); });
  }

  /* ---------- halaman (Controller) ---------- */
  var H = window.Halaman = {
    modul: [],                                   // modul yang mendaftarkan diri, urutan = urutan tab
    keadaan: { data: null, linimasa: null, kunci: null },
    /* alat bantu untuk modul */
    el: el, ikon: ikon, ribuan: ribuan, tgl: tgl, label: label, judul: judul, kosong: kosong, sel: sel,
    stikel: stikel, stikelTingkat: stikelTingkat, kartuFase: kartuFase, aturanFase: aturanFase, jumlahGap: jumlahGap,
    rincianGap: rincianGap, namaKategori: namaKategori, nadaKesiapan: nadaKesiapan, teksDokumen: teksDokumen, pecahRingkasan: pecahRingkasan,
    tingkat: TINGKAT,
    daftar: function (m) { H.modul.push(m); return m; },
    blok: function (id) { return ((H.keadaan.data && H.keadaan.data.modul) || {})[id] || {}; },
    kunci: function (id) { return ((H.keadaan.kunci && H.keadaan.kunci.modul) || {})[id] || null; },
    kategori: function () { return ((H.keadaan.data && H.keadaan.data.basis) || {}).kategori || []; }
  };

  /* pita peringatan: [ikon] [judul + pesan] — teks dibungkus satu elemen agar tidak terpotong kisi */
  function pita(id, pesan) {
    var k = $("#" + id);
    k.textContent = "";
    k.appendChild(ikon(id === "kunci" ? "kunci" : "peringatan"));
    var isi = el("div");
    isi.appendChild(el("strong", null, id === "kunci" ? "Bagian terkunci belum terbuka. " : ""));
    isi.appendChild(document.createTextNode(pesan));
    k.appendChild(isi);
  }

  function setKunciPesan(terbuka, pesan) {
    pita("kunci", pesan);
    $("#kunci").hidden = terbuka;
  }

  function renderKepala() {
    var d = H.keadaan.data || {}, w = d.data || {};
    var teks = w.jam ? w.hari + ", " + w.tanggal + " · " + w.jam + " WITA" : null;
    var s = $("#sinkron");
    s.textContent = "";
    s.appendChild(ikon("segarkan"));
    /* "Data per …" — nomor revisi register adalah urusan koordinator, hanya di kaki halaman */
    s.appendChild(document.createTextNode("Data per " + (teks || "—")));
    $("#catatan-kaki").textContent = "Halaman ini untuk memantau dan menilai kemajuan; bukan tempat mengubah status. " +
      (teks ? "Data terakhir diperbarui " + teks + " (revisi data " + d.revision + "). " : "") +
      "Jumlah berkas di kamar dan baris INDEKS dibaca dari Google Drive saat halaman diperbarui.";
  }

  /* Teks berkas untuk satu kategori: hitungan fakta saja, tanpa persen — satu baris INDEKS belum
     tentu satu berkas (G03: satu baris = satu paket; G08: satu baris = satu bulan). */
  function teksDokumen(d, dibaca) {
    if (!dibaca) return "belum terbaca dari Drive";
    d = d || {};
    var t = ribuan(d.terunggah || 0) + " berkas di kamar";
    return t + (d.baris_indeks ? " · INDEKS " + ribuan(d.baris_indeks) + " baris" : " · INDEKS belum memuat daftar");
  }

  function renderSemua() {
    renderKepala();
    H.modul.forEach(function (m) {
      var panel = document.getElementById("tab-" + m.id);
      panel.textContent = "";
      try {
        m.render(H, panel);
      } catch (e) {
        /* satu modul yang gagal tidak boleh menjatuhkan tab lain atau dianggap tautan yang salah */
        console.error("modul " + m.id + ":", e);
        panel.appendChild(kosong("Bagian ini belum dapat ditampilkan. Muat ulang halaman; bila tetap, " +
          "sampaikan ke koordinator.", "lingkaran-seru"));
      }
      var l = document.getElementById("titik-" + m.id);
      if (l) {
        var n = m.lencana ? (m.lencana() || 0) : 0;
        l.hidden = n === 0;
        l.textContent = n > 99 ? "99+" : String(n);
      }
    });
  }
  H.renderUlang = renderSemua;      // modul memanggil ini setelah mengubah keadaan tampilan (mis. saringan)
  H.bukaTab = tampilkanTab;         // modul boleh mengarahkan pengguna ke tab lain (mis. ke Unggah dokumen)
  H.IKON = IKON;

  /* ---------- tab ---------- */
  function tampilkanTab(id) {
    H.modul.forEach(function (m) {
      var aktif = m.id === id, tombol = document.getElementById("tabbtn-" + m.id);
      document.getElementById("tab-" + m.id).hidden = !aktif;
      tombol.setAttribute("aria-selected", aktif ? "true" : "false");
      tombol.tabIndex = aktif ? 0 : -1;
    });
    var nav = $("#tabs");
    if (nav.scrollWidth > nav.clientWidth + 1) {         // bilah tab yang perlu digulir di layar sedang
      document.getElementById("tabbtn-" + id).scrollIntoView({ block: "nearest", inline: "center" });
    }
    if ("#" + id !== location.hash) {                    // tab bisa ditautkan (#gap) tanpa menghapus token
      history.replaceState(null, "", location.pathname + location.search + "#" + id);
    }
  }

  function pasangModul() {
    var nav = $("#tabs"), rumah = $("#panel");
    H.modul.forEach(function (m, i) {
      var b = el("button");
      b.type = "button";
      b.id = "tabbtn-" + m.id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "tab-" + m.id);
      b.appendChild(ikon(m.ikon));
      b.appendChild(el("span", "tab__label", m.judul));
      if (m.lencana) {
        var l = el("span", "titik");
        l.id = "titik-" + m.id;
        l.hidden = true;
        b.appendChild(l);
      }
      b.addEventListener("click", function () { tampilkanTab(m.id); });
      b.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? H.modul[(i + 1) % H.modul.length]
               : e.key === "ArrowLeft" ? H.modul[(i - 1 + H.modul.length) % H.modul.length] : null;
        if (n) {
          e.preventDefault();
          var t = document.getElementById("tabbtn-" + n.id);
          t.focus();
          tampilkanTab(n.id);
        }
      });
      nav.appendChild(b);

      var s = el("section");
      s.id = "tab-" + m.id;
      s.setAttribute("role", "tabpanel");
      s.setAttribute("aria-labelledby", "tabbtn-" + m.id);
      s.hidden = true;
      rumah.appendChild(s);
    });
  }

  function tabDariHash() {
    var minta = location.hash.slice(1);
    return H.modul.some(function (m) { return m.id === minta; }) ? minta : H.modul[0].id;
  }

  /* tautan langsung (#gap) dan tombol maju/mundur peramban mengganti tab tanpa memuat ulang */
  window.addEventListener("hashchange", function () { tampilkanTab(tabDariHash()); });

  /* ---------- mulai ---------- */
  function mulai() {
    pasangModul();
    /* ditulis untuk orang yang membuka halaman dari alamat polos: ia harus tahu tautan yang
       ditekannya bukan tautan yang membuka (24 Nov: alamat polos ikut dibagikan di grup) */
    setKunciPesan(false, "Folder kamar dan rincian gap terbuka lewat tautan pada pesan pengumuman rilis " +
      "halaman ini di grup WAG. Tautan yang dibuka sekarang belum membawa kunci akses; mohon cari pesan itu, " +
      "lalu tekan tautannya.");
    /* Tautan datang dari pesan WAG. Bila tidak ada (pengguna mengetik alamat biasa), coba tautan yang
       tersimpan di peramban ini — tersimpan setelah halaman berhasil dibuka sekali dari pesan WAG. */
    var token = new URLSearchParams(window.location.search).get("tok");
    var dariTautan = !!token;
    if (!token) {
      try { token = localStorage.getItem(KUNCI_SIMPAN) || null; } catch (e) { token = null; }
    }

    Promise.all([ambilJson("data.json"), ambilJson("timeline.json")])
      .then(function (hasil) {
        if (hasil[0].bentuk !== BENTUK || hasil[1].bentuk !== BENTUK) throw new Error("BENTUK");
        H.keadaan.data = hasil[0];
        H.keadaan.linimasa = hasil[1];
        tampilkanTab(tabDariHash());
        renderSemua();
        if (!token) return null;
        return fetch(BERKAS_KUNCI + "?v=" + Date.now(), { cache: "no-store" })
          .then(function (r) { if (!r.ok) throw new Error("berkas terkunci (" + r.status + ")"); return r.arrayBuffer(); })
          .then(function (buf) { return bukaKunci(token, buf); })
          .then(function (kunci) {
            /* berhasil dibuka: simpan di peramban ini agar kunjungan berikutnya tak perlu mencari tautan lagi */
            try { localStorage.setItem(KUNCI_SIMPAN, token); } catch (e) { /* penyimpanan peramban dimatikan: abaikan */ }
            return kunci;
          })
          .catch(function (e) {
            /* tautan tersimpan sudah tidak berlaku (mis. sudah diganti): buang dan tampilkan seperti pertama kali */
            if (dariTautan) throw e;
            try { localStorage.removeItem(KUNCI_SIMPAN); } catch (e2) { /* abaikan */ }
            return null;
          });
      })
      .then(function (kunci) {
        if (!kunci) return;
        H.keadaan.kunci = kunci;
        renderSemua();
        $("#kunci").hidden = true;
        /* tombol kembali ke Google Drive (folder induk): alamatnya ada di bagian terkunci modul Unggah */
        var tautanDrive = ((((kunci.modul || {}).unggah) || {}).folder_utama || {}).folder_url, bukaDrive = $("#buka-drive");
        if (tautanDrive) {
          bukaDrive.href = tautanDrive;
          bukaDrive.hidden = false;
        }
      })
      .catch(function (e) {
        if (H.keadaan.data) setKunciPesan(false, "Tautan ini tidak membuka folder kamar dan rincian gap. " +
          "Mohon buka halaman lewat tautan pada pesan grup WAG.");
        else if (String(e.message || e) === "BENTUK") {
          /* skrip di tembolok peramban lebih lama daripada data: minta muat ulang, jangan tampil kacau */
          pita("galat", "Halaman baru saja diperbarui dan versi yang tersimpan di peramban Anda sudah lama. Muat ulang untuk melihat versi terbaru.");
          var ulang = el("button", "tombol tombol--sekunder galat__tombol", "Muat ulang halaman");
          ulang.type = "button";
          ulang.onclick = function () { location.reload(); };
          $("#galat").appendChild(ulang);
          $("#galat").hidden = false;
          $("#sinkron").textContent = "Versi halaman sudah lama";
        }
        else {
          pita("galat", "Data tidak dapat dimuat (" + String(e.message || e) + "). Coba muat ulang halaman.");
          $("#galat").hidden = false;
          $("#sinkron").textContent = "Data belum termuat";
        }
      });
  }

  /* Mulai hanya setelah SEMUA skrip modul selesai dijalankan. Skrip ber-defer dijalankan berurutan
   * sebelum DOMContentLoaded; kalau inti mulai lebih awal, modul belum sempat mendaftarkan diri. */
  if (document.readyState === "complete") mulai();
  else document.addEventListener("DOMContentLoaded", mulai);
})();
