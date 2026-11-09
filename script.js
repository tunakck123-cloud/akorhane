
let artists = [];
let songs = [];
let activeFilter = "Tümü";
let selectedSong = null;
let currentArtist = null;
let shift = 0;

const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

const shapes = {
 C:[null,3,2,0,1,0],
 D:[null,null,0,2,3,2],
 E:[0,2,2,1,0,0],
 Em:[0,2,2,0,0,0],
 A:[null,0,2,2,2,0],
 Am:[null,0,2,2,1,0],
 G:[3,2,0,0,0,3],
 F:[1,3,3,2,1,1],
 Bm:[null,2,4,4,3,2],
 Dm:[null,null,0,2,3,1]
B:[null,2,4,4,4,2],
 };

async function init() {
 try {
  const [artistResponse, songResponse] = await Promise.all([
   fetch("data/artists.json"),
   fetch("data/songs.json")
  ]);

  if (!artistResponse.ok || !songResponse.ok) {
   throw new Error("Veri dosyaları yüklenemedi.");
  }

  artists = await artistResponse.json();
  songs = await songResponse.json();

  renderArtists();
  renderSongs();
 } catch (error) {
  console.error(error);
  document.getElementById("artistGrid").textContent =
   "Sanatçılar yüklenemedi.";
  document.getElementById("songGrid").textContent =
   "Şarkılar yüklenemedi.";
 }
}

function renderArtists() {
 const grid = document.getElementById("artistGrid");

 grid.innerHTML = artists.map(artist => {
  const count = songs.filter(song =>
   song.artistId === artist.id
  ).length;

  return `
   <article class="artist" data-artist="${artist.id}">
    <div class="initial">${artist.initial}</div>
    <span class="arrow">↗</span>
    <h3>${artist.name}</h3>
    <p>${artist.genre} · ${count} şarkı</p>
   </article>
  `;
 }).join("");

 grid.querySelectorAll(".artist").forEach(card => {
  card.addEventListener("click", () => {
   openArtist(card.dataset.artist);
  });
 });
}

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
     ${song.language} · ${song.genre}
    </div>
    <h3>${song.title}</h3>
    <p>${artist ? artist.name : "Bilinmeyen sanatçı"}</p>
    <div class="song-bottom">
     <span class="muted">
      ${song.key ? "Ton: " + song.key : "Akor bekliyor"}
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
   <h2>${artist.name}</h2>`;

 document.getElementById("backButton").addEventListener("click", showHome);

 renderSongs(songs.filter(song => song.artistId === id));

 document.getElementById("archiveSection").scrollIntoView({
  behavior:"smooth"
 });
}

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
 window.scrollTo({top:0,behavior:"smooth"});
}

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
  behavior:"smooth"
 });
}

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
  selectedSong.language + " · " + selectedSong.genre;

 const hasChords = Array.isArray(selectedSong.chords) &&
  selectedSong.chords.length > 0;

 document.getElementById("chordContent").classList.toggle(
  "hidden", !hasChords
 );

 document.getElementById("detailNotice").innerHTML = hasChords
  ? '<div class="notice">Akor düzenlemesi mevcut. İçeriğin doğruluğu ayrıca kontrol edilmelidir.</div>'
  : '<div class="notice">Bu şarkının doğrulanmış akor düzenlemesi henüz eklenmedi.</div>';

 if (hasChords) updateDetails();

 document.getElementById("modal").classList.add("show");
}

function closeModal() {
 document.getElementById("modal").classList.remove("show");
}

function outsideClose(event) {
 if (event.target.id === "modal") closeModal();
}

function transposeChord(chord, amount) {
 const match = chord.match(/^([A-G]#?)(.*)$/);
 if (!match) return chord;

 const index = notes.indexOf(match[1]);
 if (index < 0) return chord;

 return notes[(index + amount + 12) % 12] + match[2];
}

function transpose(amount) {
 shift += amount;
 updateDetails();
}

function resetTranspose() {
 shift = 0;
 updateDetails();
}

function updateDetails() {
 const chords = selectedSong.chords.map(chord =>
  transposeChord(chord, shift)
 );

 document.getElementById("currentKey").textContent =
  transposeChord(selectedSong.key, shift);

 document.getElementById("chords").innerHTML =
  chords.map(chord => `<div class="chord">${chord}</div>`).join("");

 document.getElementById("progression").textContent =
  chords.join(" · ");

 document.getElementById("diagrams").innerHTML =
  [...new Set(chords)].map(chord => {
   return shapes[chord]
    ? makeDiagram(chord, shapes[chord])
    : `<div class="diagram">${chord}<p class="muted">Şema henüz eklenmedi.</p></div>`;
  }).join("");
}

function makeDiagram(name, shape) {
 const left = 16, right = 90, top = 18, bottom = 112;
 let svg = '<svg viewBox="0 0 106 135">';

 for (let i = 0; i < 6; i++) {
  const x = left + i * (right-left)/5;
  svg += `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="#aaa"/>`;
 }

 for (let i = 0; i < 5; i++) {
  const y = top + i * (bottom-top)/4;
  svg += `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#aaa" stroke-width="${i===0?3:1}"/>`;
 }

 shape.forEach((position, index) => {
  const x = left + index * (right-left)/5;

  if (position === null) {
   svg += `<text x="${x}" y="12" fill="#f88" text-anchor="middle">×</text>`;
  } else if (position === 0) {
   svg += `<circle cx="${x}" cy="7" r="3" fill="none" stroke="#f0a43a"/>`;
  } else {
   const y = top + (position-.5)*(bottom-top)/4;
   svg += `<circle cx="${x}" cy="${y}" r="5" fill="#f0a43a"/>`;
  }
 });

 svg += "</svg>";

 return `<div class="diagram"><strong>${name}</strong>${svg}<span class="muted">E A D G B E</span></div>`;
}

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

init();
