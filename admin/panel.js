const db = window.supabase.createClient(
  window.AKORHANE_CONFIG.url,
  window.AKORHANE_CONFIG.key
);

const $ = id => document.getElementById(id);

const statusText = $("adminStatus");
const logoutButton = $("logoutButton");

const artistForm = $("artistForm");
const artistList = $("artistList");
const artistMessage = $("artistMessage");

const artistOriginalId = $("artistOriginalId");
const artistName = $("artistName");
const artistId = $("artistId");
const artistLanguage = $("artistLanguage");
const artistGenre = $("artistGenre");
const artistInitial = $("artistInitial");
const artistPublished = $("artistPublished");
const artistSaveButton = $("artistSaveButton");
const artistCancelButton = $("artistCancelButton");

const songForm = $("songForm");
const songList = $("songList");
const songMessage = $("songMessage");
const songLyrics = $("songLyrics");
const songArtist = $("songArtist");
const songOriginalId = $("songOriginalId");
const chordChoice = $("chordChoice");
const chordEventList = $("chordEventList");
const lyricsPreview = $("lyricsPreview");
const selectionMessage = $("selectionMessage");

let isAdmin = false;
let artists = [];
let songs = [];
let chordEvents = [];
let selectedRange = null;

// GÜVENLİK VE GİRİŞ

async function checkAdmin() {
  try {
    const { data: sessionData, error: sessionError } =
      await db.auth.getSession();

    if (sessionError) throw sessionError;

    const user = sessionData.session?.user;

    if (!user) {
      window.location.replace("index.html");
      return;
    }

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      await db.auth.signOut();
      window.location.replace("index.html");
      return;
    }

    isAdmin = true;
    statusText.textContent = "Yönetici olarak giriş yaptın.";

    await loadArtists();
    await loadSongs();

  } catch (error) {
    console.error(error);
    statusText.textContent =
      "Yetki kontrolü başarısız: " + error.message;
  }
}

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  const { error } = await db.auth.signOut();

  if (error) {
    statusText.textContent = "Çıkış yapılamadı: " + error.message;
    logoutButton.disabled = false;
    return;
  }

  window.location.replace("index.html");
});

// YARDIMCI FONKSİYONLAR

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function createSlug(value) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// SANATÇI YÖNETİMİ

async function loadArtists() {
  artistList.textContent = "Sanatçılar yükleniyor...";

  const { data, error } = await db
    .from("artists")
    .select("*")
    .order("name");

  if (error) {
    artistList.textContent = "Hata: " + error.message;
    return;
  }

  artists = data || [];
  artistList.innerHTML = "";

  if (!artists.length) {
    artistList.textContent = "Henüz sanatçı eklenmemiş.";
  }

  artists.forEach(artist => {
    const item = document.createElement("div");
    item.className = "admin-list-item";

    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = artist.name;

    const details = document.createElement("p");
    details.textContent =
      `${artist.genre || "Tür belirtilmedi"} · ${artist.language || "Dil belirtilmedi"} · ${artist.published ? "Yayında" : "Taslak"}`;

    info.append(name, details);

    const actions = document.createElement("div");
    actions.className = "admin-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "DÜZENLE";
    editButton.addEventListener("click", () => editArtist(artist));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "SİL";
    deleteButton.className = "delete-button";
    deleteButton.addEventListener("click", () => deleteArtist(artist));

    actions.append(editButton, deleteButton);
    item.append(info, actions);
    artistList.appendChild(item);
  });

  updateArtistOptions();
}

function updateArtistOptions() {
  const currentValue = songArtist.value;

  songArtist.innerHTML = '<option value="">Sanatçı seç</option>';

  artists.forEach(artist => {
    const option = document.createElement("option");
    option.value = artist.id;
    option.textContent = artist.name;
    songArtist.appendChild(option);
  });

  songArtist.value = currentValue;
}

artistForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin) return;

  const originalId = artistOriginalId.value.trim();
  const id = artistId.value.trim().toLowerCase();
  const name = artistName.value.trim();

  if (!id || !name) {
    artistMessage.textContent = "Sanatçı adı ve kimliği zorunludur.";
    return;
  }

  if (!/^[a-z0-9-]+$/.test(id)) {
    artistMessage.textContent =
      "Kimlik yalnızca küçük İngilizce harf, rakam ve tire içerebilir.";
    return;
  }

  artistSaveButton.disabled = true;
  artistSaveButton.textContent = "KAYDEDİLİYOR...";

  const artistData = {
    id,
    name,
    language: artistLanguage.value,
    genre: artistGenre.value.trim(),
    initial: artistInitial.value.trim() || name.charAt(0).toUpperCase(),
    published: artistPublished.checked
  };

  try {
    let result;

    if (originalId) {
      result = await db
        .from("artists")
        .update({
          name: artistData.name,
          language: artistData.language,
          genre: artistData.genre,
          initial: artistData.initial,
          published: artistData.published
        })
        .eq("id", originalId);
    } else {
      result = await db
        .from("artists")
        .insert(artistData);
    }

    if (result.error) throw result.error;

    artistMessage.textContent =
      originalId ? "Sanatçı güncellendi." : "Sanatçı eklendi.";

    resetArtistForm();
    await loadArtists();

  } catch (error) {
    artistMessage.textContent = "Hata: " + error.message;
  } finally {
    artistSaveButton.disabled = false;
    artistSaveButton.textContent = "SANATÇI EKLE";
  }
});

function editArtist(artist) {
  artistOriginalId.value = artist.id;
  artistId.value = artist.id;
  artistId.disabled = true;
  artistName.value = artist.name || "";
  artistLanguage.value = artist.language || "Türkçe";
  artistGenre.value = artist.genre || "";
  artistInitial.value = artist.initial || "";
  artistPublished.checked = artist.published;

  artistSaveButton.textContent = "DEĞİŞİKLİKLERİ KAYDET";
  artistMessage.textContent = "Düzenleme modu açık.";

  artistForm.scrollIntoView({ behavior: "smooth" });
}

function resetArtistForm() {
  artistForm.reset();
  artistOriginalId.value = "";
  artistId.disabled = false;
  artistSaveButton.textContent = "SANATÇI EKLE";
}

artistCancelButton.addEventListener("click", () => {
  resetArtistForm();
  artistMessage.textContent = "";
});

async function deleteArtist(artist) {
  const approved = confirm(
    `"${artist.name}" sanatçısını silmek istediğine emin misin?\n\nBu işlem ilişkili şarkıları da silebilir.`
  );

  if (!approved) return;

  const { error } = await db
    .from("artists")
    .delete()
    .eq("id", artist.id);

  if (error) {
    artistMessage.textContent = "Silme hatası: " + error.message;
    return;
  }

  artistMessage.textContent = "Sanatçı silindi.";
  await loadArtists();
  await loadSongs();
}

// ŞARKI YÖNETİMİ

async function loadSongs() {
  songList.textContent = "Şarkılar yükleniyor...";

  const { data, error } = await db
    .from("songs")
    .select("*")
    .order("title");

  if (error) {
    songList.textContent = "Hata: " + error.message;
    return;
  }

  songs = data || [];
  songList.innerHTML = "";

  if (!songs.length) {
    songList.textContent = "Henüz şarkı eklenmemiş.";
    return;
  }

  songs.forEach(song => {
    const artist = artists.find(a => a.id === song.artist_id);

    const item = document.createElement("div");
    item.className = "admin-list-item";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = song.title;

    const details = document.createElement("p");
    details.textContent =
      `${artist?.name || "Bilinmeyen sanatçı"} · ${song.song_key || "Ton belirtilmedi"} · ${song.published ? "Yayında" : "Taslak"}`;

    info.append(title, details);

    const actions = document.createElement("div");
    actions.className = "admin-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "DÜZENLE";
    editButton.addEventListener("click", () => editSong(song));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "SİL";
    deleteButton.className = "delete-button";
    deleteButton.addEventListener("click", () => deleteSong(song));

    actions.append(editButton, deleteButton);
    item.append(info, actions);
    songList.appendChild(item);
  });
}
function editSong(song) {
  songOriginalId.value = song.id;
  $("songTitle").value = song.title || "";
  songArtist.value = song.artist_id || "";
  $("songLanguage").value = song.language || "Türkçe";
  $("songGenre").value = song.genre || "";
  $("songKey").value = song.song_key || "";
  $("songChords").value = (song.chords || []).join(", ");
  songLyrics.value = song.lyrics || "";
  $("songPublished").checked = !!song.published;

  chordEvents = Array.isArray(song.chord_events)
    ? song.chord_events.map(event => ({
        start: Number(event.start),
        end: Number(event.end),
        chord: String(event.chord || ""),
        word: String(event.word ?? songLyrics.value.slice(event.start, event.end))
      })).filter(event =>
        Number.isInteger(event.start) &&
        Number.isInteger(event.end) &&
        event.start >= 0 &&
        event.end > event.start &&
        event.end <= songLyrics.value.length &&
        event.word === songLyrics.value.slice(event.start, event.end)
      )
    : [];

  selectedRange = null;
  selectionMessage.textContent = "Sözlerden bir kelime seç.";
  renderChordEvents();
  renderLyricsPreview();

  $("songSaveButton").textContent = "DEĞİŞİKLİKLERİ KAYDET";
  songForm.scrollIntoView({ behavior: "smooth" });
}

// KELİME SEÇİMİ VE AKOR YERLEŞTİRME

function updateSelectedRange() {
  const start = songLyrics.selectionStart;
  const end = songLyrics.selectionEnd;

  if (start === end) {
    selectedRange = null;
    selectionMessage.textContent = "Bir kelimeyi seçmelisin.";
    return;
  }

  const selectedText = songLyrics.value.slice(start, end);

  if (!selectedText.trim() || /\s/.test(selectedText)) {
    selectedRange = null;
    selectionMessage.textContent =
      "Lütfen boşluk içermeyen tek bir kelime seç.";
    return;
  }

  const before = songLyrics.value[start - 1] || "";
  const after = songLyrics.value[end] || "";

  if ((before && !/\s/.test(before)) || (after && !/\s/.test(after))) {
    selectedRange = null;
    selectionMessage.textContent = "Kelimenin tamamını seçmelisin.";
    return;
  }

  selectedRange = { start, end, word: selectedText };
  selectionMessage.textContent = `Seçilen kelime: "${selectedText}"`;
}

songLyrics.addEventListener("mouseup", updateSelectedRange);
songLyrics.addEventListener("keyup", updateSelectedRange);

$("placeChordButton").addEventListener("click", () => {
  if (!selectedRange) {
    selectionMessage.textContent =
      "Önce şarkı sözlerinden bir kelime seç.";
    return;
  }

  const { start, end, word } = selectedRange;

  if (songLyrics.value.slice(start, end) !== word) {
    selectedRange = null;
    selectionMessage.textContent = "Metin değişti. Kelimeyi yeniden seç.";
    return;
  }

  const overlaps = chordEvents.some(event =>
    start < event.end && end > event.start
  );

  if (overlaps) {
    selectionMessage.textContent =
      "Bu kelimenin üzerinde zaten bir akor var. Önce onu sil.";
    return;
  }

  chordEvents.push({
    start,
    end,
    chord: chordChoice.value,
    word
  });

  chordEvents.sort((a, b) => a.start - b.start);

  selectionMessage.textContent =
    `${chordChoice.value} akoru yerleştirildi.`;

  renderChordEvents();
  renderLyricsPreview();
});

function renderChordEvents() {
  chordEventList.innerHTML = "";

  if (!chordEvents.length) {
    chordEventList.textContent = "Henüz akor eklenmedi.";
    return;
  }

  chordEvents.forEach((event, index) => {
    const item = document.createElement("div");
    item.className = "chord-event-item";

    const currentWord = songLyrics.value.slice(event.start, event.end);

    const label = document.createElement("span");
    label.textContent = `${event.chord} → ${currentWord}`;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "SİL";
    removeButton.className = "delete-button";

    removeButton.addEventListener("click", () => {
      chordEvents.splice(index, 1);
      renderChordEvents();
      renderLyricsPreview();
    });

    item.append(label, removeButton);
    chordEventList.appendChild(item);
  });
}

// AKORLARIN SÖZLER ÜZERİNDE ÖN İZLEMESİ

function renderLyricsPreview() {
  const lyrics = songLyrics.value;

  if (!lyrics) {
    lyricsPreview.textContent = "Şarkı sözleri burada görünecek.";
    return;
  }

  const sortedEvents = [...chordEvents].sort((a, b) => a.start - b.start);
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

    const matchingEvent = sortedEvents.find(event =>
      event.start === start &&
      event.end === end &&
      event.word === token
    );

    if (matchingEvent) {
      html += `<span class="preview-word has-chord"><span class="preview-chord">${escapeHTML(matchingEvent.chord)}</span>${escapeHTML(token)}</span>`;
    } else {
      html += `<span class="preview-word">${escapeHTML(token)}</span>`;
    }
  });

  lyricsPreview.innerHTML = html;
}

// SÖZLER DEĞİŞTİĞİNDE AKOR KONUMUNU KORUMA

let previousLyricsValue = songLyrics.value;

songLyrics.addEventListener("input", () => {
  const oldValue = previousLyricsValue;
  const newValue = songLyrics.value;

  let prefix = 0;

  while (
    prefix < oldValue.length &&
    prefix < newValue.length &&
    oldValue[prefix] === newValue[prefix]
  ) {
    prefix++;
  }

  let suffix = 0;

  while (
    suffix < oldValue.length - prefix &&
    suffix < newValue.length - prefix &&
    oldValue[oldValue.length - 1 - suffix] ===
      newValue[newValue.length - 1 - suffix]
  ) {
    suffix++;
  }

  const oldChangedEnd = oldValue.length - suffix;
  const newChangedEnd = newValue.length - suffix;
  const difference = newChangedEnd - oldChangedEnd;

  chordEvents = chordEvents
    .filter(event => {
      if (event.end <= prefix) return true;
      if (event.start >= oldChangedEnd) return true;
      return false;
    })
    .map(event => {
      if (event.start >= oldChangedEnd) {
        return {
          ...event,
          start: event.start + difference,
          end: event.end + difference
        };
      }

      return event;
    })
    .filter(event =>
      event.start >= 0 &&
      event.end <= newValue.length &&
      newValue.slice(event.start, event.end) === event.word
    );

  previousLyricsValue = newValue;
  selectedRange = null;

  selectionMessage.textContent =
    "Sözler güncellendi. Geçerli akor konumları korundu.";

  renderChordEvents();
  renderLyricsPreview();
});

// ŞARKI KAYDETME

songForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin) return;

  const title = $("songTitle").value.trim();
  const artistIdValue = songArtist.value;

  if (!title || !artistIdValue) {
    songMessage.textContent = "Şarkı adı ve sanatçı zorunludur.";
    return;
  }

  const originalId = songOriginalId.value.trim();
  const slug = createSlug(title) || "sarki";

  const id = originalId ||
    `${slug}-${createSlug(artists.find(a => a.id === artistIdValue)?.name || "sanatci")}-${Date.now()}`;

  const chords = $("songChords").value
    .split(",")
    .map(chord => chord.trim())
    .filter(Boolean);

  const songData = {
    id,
    title,
    artist_id: artistIdValue,
    language: $("songLanguage").value,
    genre: $("songGenre").value.trim(),
    song_key: $("songKey").value || null,
    chords,
    lyrics: songLyrics.value,
    chord_events: chordEvents,
    published: $("songPublished").checked
  };

  const saveButton = $("songSaveButton");
  saveButton.disabled = true;
  saveButton.textContent = "KAYDEDİLİYOR...";
  songMessage.textContent = "";

  try {
    let result;

    if (originalId) {
      result = await db
        .from("songs")
        .update(songData)
        .eq("id", originalId);
    } else {
      result = await db
        .from("songs")
        .insert(songData);
    }

    if (result.error) throw result.error;

    songMessage.textContent =
      originalId ? "Şarkı güncellendi." : "Şarkı başarıyla eklendi.";

    resetSongForm();
    await loadSongs();

  } catch (error) {
    songMessage.textContent = "Kayıt hatası: " + error.message;
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "ŞARKIYI KAYDET";
  }
});

function resetSongForm() {
  songForm.reset();
  songOriginalId.value = "";
  chordEvents = [];
  selectedRange = null;
  previousLyricsValue = songLyrics.value;

  selectionMessage.textContent = "Henüz kelime seçilmedi.";
  chordEventList.textContent = "Henüz akor eklenmedi.";
  lyricsPreview.textContent = "Şarkı sözleri burada görünecek.";

  $("songSaveButton").textContent = "ŞARKIYI KAYDET";
}

$("songCancelButton").addEventListener("click", () => {
  resetSongForm();
  songMessage.textContent = "";
});

async function deleteSong(song) {
  const approved = confirm(
    `"${song.title}" şarkısını silmek istediğine emin misin?`
  );

  if (!approved) return;

  const { error } = await db
    .from("songs")
    .delete()
    .eq("id", song.id);

  if (error) {
    songMessage.textContent = "Silme hatası: " + error.message;
    return;
  }

  songMessage.textContent = "Şarkı silindi.";
  await loadSongs();
}

// BAŞLAT

checkAdmin();
