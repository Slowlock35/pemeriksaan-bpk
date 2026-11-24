/* Pengendalian Pemeriksaan BPK — skrip halaman (polos, tanpa pustaka).
 * Halaman ini hanya menampilkan hasil sinkronisasi; tidak ada cara mengubah status dari sini.
 * Bagian terkunci (locked.bin) dienkripsi AES-GCM dengan kunci turunan token pada tautan. */
(function () {
  "use strict";

  var BERKAS_KUNCI = "locked.bin";
  var TINGKAT = ["TINGGI", "SEDANG", "RENDAH", "PERLU_VERIFIKASI"];
  var TINGKAT_LABEL = { TINGGI: "Tinggi", SEDANG: "Sedang", RENDAH: "Rendah", PERLU_VERIFIKASI: "Perlu verifikasi" };

  var LABEL = {
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
    fase: { berjalan: "Sedang berjalan", direncanakan: "Direncanakan", selesai: "Selesai", belum_dijadwalkan: "Mengikuti BPK" }
  };

  var keadaan = { data: null, linimasa: null, kunci: null, saring: "SEMUA" };

  /* ---------- alat bantu ---------- */
  function $(sel) { return document.querySelector(sel); }

  function el(tag, cls, teks) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (teks != null) n.textContent = teks;
    return n;
  }

  function ribuan(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  function tgl(iso) {
    if (!iso) return "belum dijadwalkan";
    var p = iso.split("-");
    var B = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return p.length === 3 ? parseInt(p[2], 10) + " " + B[parseInt(p[1], 10) - 1] + " " + p[0] : iso;
  }

  function label(grup, kode) { return (LABEL[grup] || {})[kode] || kode; }

  function namaKategori(k) { return k === "LINTAS" ? "Lintas kategori" : k; }

  function nadaKesiapan(status) {
    return { NOT_ASSESSED: "rencana", COLLECTING: "jalan", PARTIAL: "jalan", READY_FOR_REVIEW: "teal",
             VERIFIED: "selesai", REOPENED: "terlambat", RECHECK_REQUIRED: "emas" }[status] || "rencana";
  }

  function stikel(teks, nada) {
    return el("span", "status" + (nada ? " status--" + nada : ""), teks);
  }

  function kosong(teks) { return el("li", "kosong", teks); }

  function jumlahGap(g) {
    g = g || {};
    var t = 0;
    TINGKAT.forEach(function (x) { t += g[x] || 0; });
    return t;
  }

  function rincianGap(g) {
    var bagian = [];
    TINGKAT.forEach(function (x) { if (g && g[x]) bagian.push(g[x] + " " + TINGKAT_LABEL[x].toLowerCase()); });
    return bagian;
  }

  function ambilJson(url) {
    return fetch(url + "?v=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url + " (" + r.status + ")");
      return r.json();
    });
  }

  function setKunciPesan(terbuka, pesan) {
    var k = $("#kunci");
    k.hidden = terbuka;
    k.textContent = "";
    k.appendChild(el("strong", null, "Bagian terkunci belum terbuka. "));
    k.appendChild(document.createTextNode(pesan));
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

  /* ---------- tampilan ---------- */
  function renderSinkron(d) {
    var w = d.data || {};
    var teks = w.jam ? w.hari + ", " + w.tanggal + " · " + w.jam + " WITA" : "belum tersedia";
    $("#sinkron").textContent = "Revisi " + d.revision + " · " + teks;
    $("#catatan-kaki").textContent = "Halaman ini proyeksi dari register koordinator (revisi " + d.revision +
      ", data terakhir berubah " + teks + ") dan bukan tempat mengubah status. " +
      "Jumlah dokumen terunggah dibaca dari Google Drive saat halaman disinkronkan.";
  }

  function renderKpi(d) {
    var r = d.ringkasan || {}, kotak = $("#kpi");
    kotak.textContent = "";
    var fase = r.fase_aktif || {}, tenggat = r.tenggat_berikut || {}, gap = r.gap || {}, dok = r.dokumen || {};
    var tinggi = gap.TINGGI || 0, sedang = gap.SEDANG || 0;
    var baris = [
      ["Fase saat ini", fase.no ? "Fase " + fase.no : "—",
       fase.nama ? fase.nama + " · s.d. " + tgl(fase.selesai) : "belum dimulai"],
      ["Menuju tenggat", tenggat.hari != null ? tenggat.hari + " hari" : "—",
       tenggat.label || "tidak ada tenggat bertanggal"],
      ["Gap terbuka", jumlahGap(gap), tinggi + " tinggi · " + sedang + " sedang"],
      ["Dokumen terunggah", dok.dibaca_dari_drive === false ? "—" : String(dok.terunggah || 0),
       dok.dibaca_dari_drive === false ? "belum terbaca dari Drive"
         : "berkas di kamar Drive · target terukur pada " + (dok.terukur_pada || 0) + " dari " +
           (dok.total_kategori || 0) + " kategori"]
    ];
    baris.forEach(function (b) {
      var k = el("div", "kpi__kartu");
      k.appendChild(el("div", "kpi__label", b[0]));
      k.appendChild(el("div", "kpi__nilai", String(b[1])));
      k.appendChild(el("div", "kpi__cat", b[2]));
      kotak.appendChild(k);
    });
    var titik = $("#titik-gap"), total = jumlahGap(gap);
    titik.hidden = total === 0;
    titik.textContent = total > 99 ? "99+" : String(total);
  }

  function renderFase(daftar, tujuan, rinci) {
    var w = $(tujuan);
    w.textContent = "";
    (daftar || []).forEach(function (f) {
      var li = el("li");
      li.dataset.status = f.status;
      li.appendChild(el("span", "fase__nama", f.nama));
      var waktu = f.mulai
        ? (f.selesai && f.selesai !== f.mulai ? tgl(f.mulai) + " – " + tgl(f.selesai) : tgl(f.mulai))
        : (f.ket_waktu || "belum dijadwalkan");
      li.appendChild(el("span", "fase__waktu", waktu));
      if (f.status === "belum_dijadwalkan") li.appendChild(el("span", "fase__ket", "Mengikuti BPK"));
      else if (f.ket_waktu) li.appendChild(el("span", "fase__ket", f.ket_waktu));
      if (rinci && f.uraian) li.appendChild(el("span", "fase__uraian", f.uraian));
      if (rinci) li.appendChild(stikel(label("fase", f.status), f.status === "berjalan" ? "teal" : f.status === "selesai" ? "selesai" : "rencana"));
      w.appendChild(li);
    });
  }

  function renderUbin(d) {
    var w = $("#ubin");
    w.textContent = "";
    (d.kategori || []).forEach(function (k) {
      var li = el("li");
      li.appendChild(el("div", "ubin__id", k.id));
      li.appendChild(el("div", "ubin__nama", k.nama));
      var bw = el("div", "ubin__bawah");
      bw.appendChild(stikel(label("kesiapan", k.kesiapan), nadaKesiapan(k.kesiapan)));
      var t = jumlahGap(k.gap);
      if (t) bw.appendChild(stikel(t + " gap", "terlambat"));
      li.appendChild(bw);
      w.appendChild(li);
    });
  }

  function selDokumen(k, dibaca) {
    var td = el("td", "angka"), d = k.dokumen || {};
    if (!dibaca) {                       // Drive tidak terbaca: tidak menampilkan 0 seolah hasil ukur
      td.appendChild(el("span", "bilah-hint", d.terukur ? "belum terbaca dari Drive · target " + ribuan(d.target) + " berkas" : "belum terbaca dari Drive"));
      return td;
    }
    if (d.terukur) {
      var target = d.target || 0, naik = d.terunggah || 0, persen = target ? Math.round(100 * naik / target) : 0;
      var bar = el("div", "bilah"), isi = el("div", "bilah__isi");
      isi.style.width = Math.min(100, persen) + "%";
      bar.appendChild(isi);
      td.appendChild(bar);
      td.appendChild(el("small", null, ribuan(naik) + " dari " + ribuan(target) + " berkas · " + persen + "%"));
    } else {
      td.appendChild(el("span", "bilah-hint", "belum terukur · " + (d.terunggah || 0) + " berkas"));
    }
    return td;
  }

  function renderTabelKategori(d) {
    var dibaca = ((d.ringkasan || {}).dokumen || {}).dibaca_dari_drive !== false;
    var t = $("#tabel-kategori");
    t.textContent = "";
    var kepala = el("thead"), hr = el("tr");
    ["Kategori", "Kesiapan", "Penyampaian", "Penilaian BPK", "Dokumen", "Gap terbuka", "Tenggat"].forEach(function (h) {
      var th = el("th", null, h);
      th.scope = "col";
      hr.appendChild(th);
    });
    kepala.appendChild(hr);
    t.appendChild(kepala);
    var badan = el("tbody");
    (d.kategori || []).forEach(function (k) {
      var tr = el("tr");
      var td1 = el("td");
      td1.appendChild(el("span", "kode", k.id));
      td1.appendChild(el("div", null, k.nama));
      td1.appendChild(el("div", "bilah-hint", "Nomor BPK " + (k.nomor_bpk || "—")));
      tr.appendChild(td1);
      var td2 = el("td");
      td2.appendChild(stikel(label("kesiapan", k.kesiapan), nadaKesiapan(k.kesiapan)));
      tr.appendChild(td2);
      var td3 = el("td");
      td3.appendChild(stikel(label("penyampaian", k.penyampaian),
        k.penyampaian === "RECEIPT_RECORDED" || k.penyampaian === "SENT" ? "selesai" : "rencana"));
      tr.appendChild(td3);
      tr.appendChild(el("td", null, label("penilaian", k.penilaian)));
      tr.appendChild(selDokumen(k, dibaca));
      var bagian = rincianGap(k.gap);
      tr.appendChild(el("td", null, bagian.length ? bagian.join(" · ") : "tidak ada"));
      tr.appendChild(el("td", null, tgl(k.tenggat)));
      badan.appendChild(tr);
    });
    t.appendChild(badan);
  }

  function renderSaring(d) {
    var w = $("#saring");
    w.textContent = "";
    var jumlah = {};
    (keadaan.kunci && keadaan.kunci.gaps || []).forEach(function (g) { jumlah[g.kategori] = (jumlah[g.kategori] || 0) + 1; });
    function tombol(teks, nilai) {
      var b = el("button", null, teks);
      b.type = "button";
      b.setAttribute("aria-pressed", keadaan.saring === nilai ? "true" : "false");
      b.onclick = function () { keadaan.saring = nilai; renderSaring(d); renderGap(); };
      w.appendChild(b);
    }
    tombol("Semua", "SEMUA");
    (d.kategori || []).concat([{ id: "LINTAS" }]).forEach(function (k) {
      if (jumlah[k.id]) tombol(namaKategori(k.id) + " · " + jumlah[k.id], k.id);
    });
  }

  function renderGap() {
    var w = $("#daftar-gap");
    w.textContent = "";
    if (!keadaan.kunci) {
      (keadaan.data.kategori || []).forEach(function (k) {
        var bagian = rincianGap(k.gap);
        if (!bagian.length) return;
        var li = el("li", "gap"), atas = el("div", "gap__atas");
        atas.appendChild(el("span", "kode", k.id));
        atas.appendChild(el("span", null, k.nama));
        li.appendChild(atas);
        li.appendChild(el("div", "gap__judul", jumlahGap(k.gap) + " gap terbuka: " + bagian.join(", ") + ". Rincianya terkunci."));
        w.appendChild(li);
      });
      if (!w.children.length) w.appendChild(kosong("Tidak ada gap terbuka yang tercatat di register."));
      return;
    }
    /* tingkat tertinggi lebih dulu, lalu menurut kategori */
    var daftar = (keadaan.kunci.gaps || []).filter(function (g) { return keadaan.saring === "SEMUA" || g.kategori === keadaan.saring; });
    daftar.sort(function (a, b) {
      return (TINGKAT.indexOf(a.tingkat) - TINGKAT.indexOf(b.tingkat)) || (a.kategori < b.kategori ? -1 : 1);
    });
    daftar.forEach(function (g) {
      var li = el("li", "gap"), atas = el("div", "gap__atas");
      li.dataset.tingkat = g.tingkat;
      atas.appendChild(el("span", "kode", namaKategori(g.kategori)));
      atas.appendChild(stikel(TINGKAT_LABEL[g.tingkat] || g.tingkat,
        g.tingkat === "TINGGI" ? "terlambat" : g.tingkat === "SEDANG" ? "jalan" : g.tingkat === "RENDAH" ? "selesai" : "rencana"));
      atas.appendChild(stikel(label("gap", g.status), g.status === "SELESAI" ? "selesai" : "teal"));
      li.appendChild(atas);
      li.appendChild(el("div", "gap__judul", g.judul));
      if (g.pic) li.appendChild(el("div", "gap__meta", "Penangan: " + g.pic));
      if (g.mitigasi) li.appendChild(el("div", "gap__meta", "Mitigasi: " + g.mitigasi));
      if (g.diperbarui) li.appendChild(el("div", "bilah-hint", "Diperbarui " + tgl(g.diperbarui)));
      w.appendChild(li);
    });
    if (!daftar.length) w.appendChild(kosong("Tidak ada gap terbuka untuk saringan ini."));
  }

  function renderMitigasi() {
    var m = keadaan.data.kendali || {}, k = $("#mitigasi-ringkas");
    k.textContent = "";
    [["lewat_tenggat", "Batas internal terlewat"], ["belum_dinilai", "Belum dinilai"],
     ["total", "Butir daftar kendali"], ["selesai", "Sudah selesai"]]
      .forEach(function (b) { k.appendChild(el("div", "gap__meta", b[1] + ": " + (m[b[0]] || 0))); });
    k.appendChild(el("div", "bilah-hint", "Belum dinilai berarti buktinya belum diperiksa, bukan berarti tidak dikerjakan."));
    var w = $("#daftar-mitigasi");
    w.textContent = "";
    if (!keadaan.kunci) return;
    var daftar = keadaan.kunci.kendala_lewat || [];
    if (!daftar.length) { w.appendChild(kosong("Tidak ada butir yang batas internalnya terlewat.")); return; }
    daftar.forEach(function (b) {
      var li = el("li", "gap"), atas = el("div", "gap__atas");
      li.dataset.tingkat = "SEDANG";
      atas.appendChild(stikel("Batas " + tgl(b.tenggat), "terlambat"));
      if (b.status) atas.appendChild(stikel(b.status, "rencana"));
      li.appendChild(atas);
      li.appendChild(el("div", "gap__judul", b.tindakan));
      if (b.peran) li.appendChild(el("div", "gap__meta", "Peran: " + b.peran));
      w.appendChild(li);
    });
  }

  function renderUnggah(d) {
    var w = $("#kartu-unggah");
    w.textContent = "";
    var terkunci = {};
    var dibaca = ((d.ringkasan || {}).dokumen || {}).dibaca_dari_drive !== false;
    (keadaan.kunci && keadaan.kunci.kategori || []).forEach(function (x) { terkunci[x.id] = x; });
    (d.kategori || []).forEach(function (k) {
      var x = terkunci[k.id] || {}, dkk = k.dokumen || {}, buka = !!keadaan.kunci;
      var c = el("article", "kartu kartu-unggah");
      c.appendChild(el("span", "kode", k.id + " · Nomor BPK " + (k.nomor_bpk || "—")));
      c.appendChild(el("h3", null, k.nama));
      var status = el("div");
      status.appendChild(stikel(label("kesiapan", k.kesiapan), nadaKesiapan(k.kesiapan)));
      c.appendChild(status);
      var dl = el("dl");
      function baris(judul, isi) { dl.appendChild(el("dt", null, judul)); dl.appendChild(el("dd", null, isi)); }
      baris("Dokumen", !dibaca ? "belum terbaca dari Drive"
        : dkk.terukur ? ribuan(dkk.terunggah || 0) + " dari " + ribuan(dkk.target || 0) + " berkas"
                      : (dkk.terunggah || 0) + " berkas · target belum terukur");
      baris("Tenggat", tgl(k.tenggat));
      baris("Penanggung jawab", buka ? (x.penanggung_jawab || "belum ditetapkan di register") : "terkunci");
      baris("PIC bidang terkait", buka ? ((x.pic_bidang || []).join(", ") || "belum dipetakan") : "terkunci");
      baris("Menelaah", buka ? ((x.penelaah || []).join(", ") || "PPK") : "terkunci");
      c.appendChild(dl);
      var bw = el("div", "kartu-unggah__bawah");
      if (x.folder_url) {
        var a = el("a", "tombol tombol--utama", "Buka folder kategori ini");
        a.href = x.folder_url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        bw.appendChild(a);
      } else {
        var b = el("button", "tombol tombol--sekunder", buka ? "Tautan folder belum tersedia" : "Terkunci · butuh tautan bertoken");
        b.type = "button";
        b.disabled = true;
        bw.appendChild(b);
      }
      c.appendChild(bw);
      w.appendChild(c);
    });
  }

  function renderLanjut() {
    var w = $("#isi-lanjut"), t = keadaan.data.tindak_lanjut || {};
    w.textContent = "";
    var k = el("div", "kartu kartu--lebar kosong-besar");
    if (!t.tersedia) {
      k.appendChild(el("strong", null, "Belum ada data tindak lanjut"));
      k.appendChild(document.createTextNode("Bagian ini terisi saat fase LHP dan tindak lanjut dimulai. Tanggalnya mengikuti BPK."));
    } else {
      k.appendChild(el("strong", null, "Tindak lanjut"));
      k.appendChild(document.createTextNode(t.catatan || ""));
    }
    w.appendChild(k);
  }

  function renderSemua() {
    renderSinkron(keadaan.data);
    renderKpi(keadaan.data);
    renderFase(keadaan.linimasa.fase || [], "#fase-ringkasan", false);
    renderFase(keadaan.linimasa.fase || [], "#fase-linimasa", true);
    renderUbin(keadaan.data);
    renderTabelKategori(keadaan.data);
    renderSaring(keadaan.data);
    renderGap();
    renderMitigasi();
    renderUnggah(keadaan.data);
    renderLanjut();
  }

  /* ---------- tab ---------- */
  var DAFTAR_TAB = ["ringkasan", "linimasa", "gap", "unggah", "lanjut"];

  function tampilkanTab(nama) {
    DAFTAR_TAB.forEach(function (t) {
      var aktif = t === nama;
      $("#tab-" + t).hidden = !aktif;
      var tombol = $('#tabs [data-tab="' + t + '"]');
      tombol.setAttribute("aria-selected", aktif ? "true" : "false");
      tombol.tabIndex = aktif ? 0 : -1;
      if (aktif && tombol.scrollIntoView) tombol.scrollIntoView({ block: "nearest", inline: "center" });
    });
  }

  function pasangTab() {
    var tombol = Array.prototype.slice.call(document.querySelectorAll("#tabs [data-tab]"));
    tombol.forEach(function (b, i) {
      b.addEventListener("click", function () { tampilkanTab(b.dataset.tab); });
      b.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? tombol[(i + 1) % tombol.length]
               : e.key === "ArrowLeft" ? tombol[(i - 1 + tombol.length) % tombol.length] : null;
        if (n) { e.preventDefault(); n.focus(); tampilkanTab(n.dataset.tab); }
      });
    });
  }

  /* ---------- mulai ---------- */
  function mulai() {
    pasangTab();
    setKunciPesan(false, "Penanggung jawab, tautan folder, dan rincian gap hanya dapat dibuka lewat tautan bertoken dari PPK.");
    var token = new URLSearchParams(window.location.search).get("tok");

    Promise.all([ambilJson("data.json"), ambilJson("timeline.json")])
      .then(function (hasil) {
        keadaan.data = hasil[0];
        keadaan.linimasa = hasil[1];
        renderSemua();
        if (!token) return null;
        return fetch(BERKAS_KUNCI + "?v=" + Date.now(), { cache: "no-store" })
          .then(function (r) { if (!r.ok) throw new Error("berkas terkunci (" + r.status + ")"); return r.arrayBuffer(); })
          .then(function (buf) { return bukaKunci(token, buf); });
      })
      .then(function (kunci) {
        if (!kunci) return;
        keadaan.kunci = kunci;
        renderSemua();
        $("#kunci").hidden = true;
      })
      .catch(function (e) {
        if (keadaan.data) setKunciPesan(false, "Tautan ini tidak membuka bagian terkunci. Gunakan tautan bertoken terbaru dari PPK.");
        else {
          var k = $("#galat");
          k.textContent = "Data tidak dapat dimuat (" + String(e.message || e) + "). Coba muat ulang halaman.";
          k.hidden = false;
          $("#sinkron").textContent = "Data belum termuat";
        }
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
  else mulai();
})();
