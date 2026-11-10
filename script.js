
let artists = [];
let songs = [];
let activeFilter = "Tümü";
let selectedSong = null;
let currentArtist = null;
let shift = 0;

const notes = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B"
];

const roots = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const lowE = {
  "C": 8, "C#": 9, "D": 10, "D#": 11,
  "E": 0, "F": 1, "F#": 2, "G": 3,
  "G#": 4, "A": 5, "A#": 6, "B": 7
};

const aString = {
  "C": 3, "C#": 4, "D": 5, "D#": 6,
  "E": 7, "F": 8, "F#": 9, "G": 10,
  "G#": 11, "A": 0, "A#": 1, "B": 2
};

const shapes = {};

roots.forEach(root => {
  const e = lowE[root];
  const a = aString[root];

  shapes[root] = [e, e + 2, e + 2, e + 1, e, e];
  shapes[root + "m"] = [e, e + 2, e + 2, e, e, e];
  shapes[root + "7"] = [e, e + 2, e, e + 1, e, e];
  shapes[root + "maj7"] = [null, a, a + 2, a + 1, a + 2, a];
  shapes[root + "m7"] = [null, a, a + 2, a, a + 1, a];
});

Object.assign(shapes, {
  "C":   [null, 3, 2, 0, 1, 0],
  "D":   [null, null, 0, 2, 3, 2],
  "E":   [0, 2, 2, 1, 0, 0],
  "G":   [3, 2, 0, 0, 0, 3],
  "A":   [null, 0, 2, 2, 2, 0],

  "Am":  [null, 0, 2, 2, 1, 0],
  "Dm":  [null, null, 0, 2, 3, 1],
  "Em":  [0, 2, 2, 0, 0, 0],

  "E7":  [0, 2, 0, 1, 0, 0],
  "A7":  [null, 0, 2, 0, 2, 0],
  "D7":  [null, null, 0, 2, 1, 2],

  "Cmaj7": [null, 3, 2, 0, 0, 0],
  "Am7":   [null, 0, 2, 0, 1, 0],
  "Em7":   [0, 2, 2, 0, 3, 0]
});

function normalizeChord(chord) {
  const value = String(chord || "").trim();
  const match = value.match(/^([a-g])([#b]?)(.*)$/i);

  if (!match) return value;

  return match[1].toUpperCase() + match[2] + match[3];
}

function chordRootToSharp(root) {
  return ({
    "Db": "C#",
    "Eb": "D#",
    "Gb": "F#",
    "Ab": "G#",
    "Bb": "A#"
  })[root] || root;
}

let db = null;

/* SUPABASE BAĞLANTISI */

async function init() {
  try {
    if (!window.supabase || !window.AKORHANE_CONFIG) {
      throw new Error("Supabase bağlantı dosyaları yüklenemedi.");
    }

    db = window.supabase.createClient(
      window.AKORHANE_CONFIG.url,
      window.AKORHANE_CONFIG.key
    );

    const [artistResult, songResult] = await Promise.all([
      db.from("artists")
        .select("*")
        .eq("published", true)
        .order("name"),

      db.from("songs")
        .select("*")
        .eq("published", true)
        .order("title")
    ]);

    if (artistResult.error) throw artistResult.error;
    if (songResult.error) throw songResult.error;

    artists = artistResult.data || [];

    songs = (songResult.data || []).map(song => ({
      ...song,
      artistId: song.artist_id,
      key: song.song_key,
      chords: song.chords || [],
      chord_events: song.chord_events || []
    }));

    renderArtists();
    renderSongs();

  } catch (error) {
    console.error("AKORHANE bağlantı hatası:", error);

    document.getElementById("artistGrid").textContent =
      "Sanatçılar yüklenemedi.";

    document.getElementById("songGrid").textContent =
      "Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.";
  }
}

/* HTML GÜVENLİĞİ */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

/* SANATÇILARI GÖSTER */

function renderArtists() {
  const grid = document.getElementById("artistGrid");

  grid.innerHTML = artists.map(artist => {
    const count = songs.filter(song =>
      song.artistId === artist.id
    ).length;

    return `
      <article class="artist" data-artist="${escapeHTML(artist.id)}">
        <div class="initial">${escapeHTML(artist.initial || artist.name[0])}</div>
        <span class="arrow">↗</span>
        <h3>${escapeHTML(artist.name)}</h3>
        <p>${escapeHTML(artist.genre || "")} · ${count} şarkı</p>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".artist").forEach(card => {
    card.addEventListener("click", () => {
      openArtist(card.dataset.artist);
    });
  });
}

/* ŞARKILARI GÖSTER */

function renderSongs(list = songs) {
  const grid = document.getElementById("songGrid");

  document.getElementById("songCount").textContent =
    list.length + " şarkı";

  grid.innerHTML = list.length ? list.map(song => {
    const artist = artists.find(a => a.id === song.artistId);
    const index = songs.indexOf(song);

    return `
      <article class="song">
        <div class="genre">
          ${escapeHTML(song.language || "")} · ${escapeHTML(song.genre || "")}
        </div>
        <h3>${escapeHTML(song.title)}</h3>
        <p>${escapeHTML(artist ? artist.name : "Bilinmeyen sanatçı")}</p>
        <div class="song-bottom">
          <span class="muted">
            ${song.key ? "Ton: " + escapeHTML(song.key) : "Akor bekliyor"}
          </span>
          <button class="open" data-song="${index}">
            İNCELE →
          </button>
        </div>
      </article>
    `;
  }).join("") : '<p class="muted">Şarkı bulunamadı.</p>';

  grid.querySelectorAll("[data-song]").forEach(button => {
    button.addEventListener("click", () => {
      openSong(Number(button.dataset.song));
    });
  });
}

/* SANATÇI SAYFASI */

function openArtist(id) {
  currentArtist = id;

  const artist = artists.find(a => a.id === id);
  if (!artist) return;

  document.getElementById("homeHero").classList.add("hidden");
  document.getElementById("artistSection").classList.add("hidden");
  document.getElementById("filters").classList.add("hidden");

  document.getElementById("archiveTitle").textContent =
    artist.name + " · Şarkılar";

  document.getElementById("artistHeading").innerHTML =
    `<button class="back" id="backButton">← Tüm sanatçılar</button>
     <div class="eyebrow">SANATÇI ARŞİVİ</div>
     <h2>${escapeHTML(artist.name)}</h2>`;

  document.getElementById("backButton").addEventListener("click", showHome);

  renderSongs(songs.filter(song => song.artistId === id));

  document.getElementById("archiveSection").scrollIntoView({
    behavior: "smooth"
  });
}

/* ANA SAYFA */

function showHome() {
  currentArtist = null;

  document.getElementById("homeHero").classList.remove("hidden");
  document.getElementById("artistSection").classList.remove("hidden");
  document.getElementById("filters").classList.remove("hidden");

  document.getElementById("artistHeading").innerHTML = "";
  document.getElementById("archiveTitle").textContent = "Şarkı Arşivi";
  document.getElementById("search").value = "";

  activeFilter = "Tümü";

  document.querySelectorAll(".filter").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === "Tümü");
  });

  renderSongs();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ARAMA */

function searchAll() {
  currentArtist = null;

  document.getElementById("artistSection").classList.remove("hidden");
  document.getElementById("filters").classList.remove("hidden");
  document.getElementById("artistHeading").innerHTML = "";

  document.getElementById("archiveTitle").textContent = "Arama Sonuçları";

  const query = document.getElementById("search").value
    .toLocaleLowerCase("tr").trim();

  const results = songs.filter(song => {
    const artist = artists.find(a => a.id === song.artistId);
    const searchable = song.title + " " + (artist ? artist.name : "");

    return searchable.toLocaleLowerCase("tr").includes(query);
  });

  renderSongs(results);

  document.getElementById("archiveSection").scrollIntoView({
    behavior: "smooth"
  });
}

/* FİLTRELEME */

function applyFilter(filter) {
  activeFilter = filter;
  currentArtist = null;

  document.getElementById("artistSection").classList.remove("hidden");
  document.getElementById("homeHero").classList.remove("hidden");
  document.getElementById("filters").classList.remove("hidden");
  document.getElementById("artistHeading").innerHTML = "";
  document.getElementById("archiveTitle").textContent = "Şarkı Arşivi";

  const results = songs.filter(song =>
    filter === "Tümü" ||
    song.language === filter ||
    song.genre === filter
  );

  renderSongs(results);
}

/* ŞARKI DETAYI */

function openSong(index) {
  selectedSong = songs[index];
  if (!selectedSong) return;

  shift = 0;

  const artist = artists.find(a => a.id === selectedSong.artistId);

  document.getElementById("detailTitle").textContent =
    selectedSong.title;

  document.getElementById("detailArtist").textContent =
    artist ? artist.name : "";

  document.getElementById("detailGenre").textContent =
    (selectedSong.language || "") + " · " + (selectedSong.genre || "");

  const hasChords = Array.isArray(selectedSong.chords) &&
    selectedSong.chords.length > 0;

  const hasLyrics = Boolean(selectedSong.lyrics?.trim());

  const hasChordEvents = Array.isArray(selectedSong.chord_events) &&
    selectedSong.chord_events.length > 0;

  const hasContent = hasChords || hasLyrics || hasChordEvents;

  document.getElementById("chordContent").classList.toggle(
    "hidden", !hasContent
  );

  document.getElementById("detailNotice").innerHTML = hasContent
    ? '<div class="notice">Şarkı içeriği hazır.</div>'
    : '<div class="notice">Bu şarkının akor ve söz düzenlemesi henüz eklenmedi.</div>';

  document.getElementById("lyricsSection").classList.toggle(
    "hidden", !hasLyrics
  );

  if (hasContent) updateDetails();

  document.getElementById("modal").classList.add("show");
}

function closeModal() {
  document.getElementById("modal").classList.remove("show");
}

function outsideClose(event) {
  if (event.target.id === "modal") closeModal();
}

/* TON DEĞİŞTİRME */

function transposeChord(chord, amount) {
  const normalized = normalizeChord(chord);
  const match = normalized.match(/^([A-G])([#b]?)(.*)$/);

  if (!match) return normalized;

  const root = chordRootToSharp(match[1] + match[2]);
  const index = notes.indexOf(root);

  if (index < 0) return normalized;

  return notes[(index + amount + 120) % 12] + match[3];
}

function transpose(amount) {
  shift += amount;
  updateDetails();
}

function resetTranspose() {
  shift = 0;
  updateDetails();
}

/* AKORLARI VE ŞEMALARI GÜNCELLE */

function updateDetails() {
  const chords = (selectedSong.chords || []).flatMap(value =>
    String(value || "")
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map(chord => transposeChord(normalizeChord(chord), shift))
  );

  document.getElementById("currentKey").textContent =
    selectedSong.key
      ? transposeChord(selectedSong.key, shift)
      : "Belirtilmedi";

  document.getElementById("chords").innerHTML =
    chords.map(chord =>
      `<div class="chord">${escapeHTML(chord)}</div>`
    ).join("");

  document.getElementById("progression").textContent =
    chords.join(" · ");

  document.getElementById("diagrams").innerHTML =
    [...new Set(chords)].map(chord => {
      const shapeKey = normalizeChord(chord);

      return shapes[shapeKey]
        ? makeDiagram(chord, shapes[shapeKey])
        : `<div class="diagram">
             <strong>${escapeHTML(chord)}</strong>
             <p class="muted">Bu akor için şema henüz eklenmedi.</p>
           </div>`;
    }).join("");

  renderSongLyrics();
}

/* ŞARKI SÖZLERİ VE ÜZERİNDEKİ AKORLAR */

function renderSongLyrics() {
  const display = document.getElementById("songLyricsDisplay");

  const lyrics = (selectedSong.lyrics || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  if (!lyrics.trim()) {
    display.innerHTML = "";
    return;
  }

  const events = (selectedSong.chord_events || [])
    .filter(event =>
      Number.isInteger(event.start) &&
      Number.isInteger(event.end) &&
      event.start >= 0 &&
      event.end <= lyrics.length &&
      event.end > event.start
    )
    .sort((a, b) => a.start - b.start);

  const tokens = lyrics.match(/\s+|[^\s]+/g) || [];

  let position = 0;
  let html = "";

  tokens.forEach(token => {
    const start = position;
    const end = start + token.length;
    position = end;

    if (/^\s+$/.test(token)) {
      html += escapeHTML(token);
      return;
    }

    const matchingEvents = events.filter(event =>
      event.start === start && event.end === end
    );

    const safeWord = escapeHTML(token);

    if (matchingEvents.length) {
      const labels = matchingEvents.map(event => {
        const chord = transposeChord(event.chord, shift);
        return `<span class="song-chord">${escapeHTML(chord)}</span>`;
      }).join("");

      html += `<span class="lyric-word has-song-chord">${labels}<span class="lyric-text">${safeWord}</span></span>`;
    } else {
      html += `<span class="lyric-word">${safeWord}</span>`;
    }
  });

  display.innerHTML = html;
}

/* GİTAR AKOR ŞEMASI */

function makeDiagram(name, shape) {
  const left = 16, right = 90, top = 22, bottom = 112;

  const fretted = shape.filter(value =>
    Number.isInteger(value) && value > 0
  );

  const minFret = fretted.length ? Math.min(...fretted) : 1;
  const offset = minFret > 1 ? minFret - 1 : 0;

  let svg = '<svg viewBox="0 0 106 140" role="img" aria-label="' +
    escapeHTML(name) + ' akor şeması">';

  if (offset > 0) {
    svg += `<text x="4" y="${top + 12}" fill="#aaa" font-size="9">${offset + 1}. perde</text>`;
  }

  for (let i = 0; i < 6; i++) {
    const x = left + i * (right - left) / 5;

    svg += `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="#aaa" stroke-width="1"/>`;
  }

  for (let i = 0; i < 5; i++) {
    const y = top + i * (bottom - top) / 4;

    svg += `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#aaa" stroke-width="${i === 0 && offset === 0 ? 3 : 1}"/>`;
  }

  shape.forEach((position, index) => {
    const x = left + index * (right - left) / 5;

    if (position === null) {
      svg += `<text x="${x}" y="14" fill="#f88" font-size="12" text-anchor="middle">×</text>`;
    } else if (position === 0) {
      svg += `<circle cx="${x}" cy="10" r="3" fill="none" stroke="#f0a43a" stroke-width="1.5"/>`;
    } else {
      const relativeFret = position - offset;
      const y = top + (relativeFret - 0.5) * (bottom - top) / 4;

      svg += `<circle cx="${x}" cy="${y}" r="5" fill="#f0a43a"/>`;
    }
  });

  svg += "</svg>";

  return `
    <div class="diagram">
      <strong>${escapeHTML(name)}</strong>
      ${svg}
      <span class="muted">E A D G B e</span>
    </div>
  `;
}

/* FİLTRE VE ARAMA OLAYLARI */

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");
    applyFilter(button.dataset.filter);
  });
});

document.getElementById("search").addEventListener("input", searchAll);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

/* UYGULAMAYI BAŞLAT */

init();
