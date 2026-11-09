
const db = window.supabase.createClient(
  window.AKORHANE_CONFIG.url,
  window.AKORHANE_CONFIG.key
);

const statusText = document.getElementById("adminStatus");
const logoutButton = document.getElementById("logoutButton");

const artistForm = document.getElementById("artistForm");
const artistList = document.getElementById("artistList");
const artistMessage = document.getElementById("artistMessage");

const artistOriginalId = document.getElementById("artistOriginalId");
const artistName = document.getElementById("artistName");
const artistId = document.getElementById("artistId");
const artistLanguage = document.getElementById("artistLanguage");
const artistGenre = document.getElementById("artistGenre");
const artistInitial = document.getElementById("artistInitial");
const artistPublished = document.getElementById("artistPublished");
const artistSaveButton = document.getElementById("artistSaveButton");
const artistCancelButton = document.getElementById("artistCancelButton");

let isAdmin = false;

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

  } catch (error) {
    console.error(error);
    statusText.textContent = "Yetki kontrolü başarısız: " + error.message;
  }
}

async function loadArtists() {
  artistList.textContent = "Sanatçılar yükleniyor...";

  const { data, error } = await db
    .from("artists")
    .select("*")
    .order("name");

  if (error) {
    artistList.textContent = "Sanatçılar yüklenemedi: " + error.message;
    return;
  }

  artistList.innerHTML = "";

  if (!data.length) {
    artistList.textContent = "Henüz sanatçı eklenmemiş.";
    return;
  }

  data.forEach(artist => {
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
  artistMessage.textContent = "";

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

    artistMessage.textContent = originalId
      ? "Sanatçı güncellendi."
      : "Sanatçı başarıyla eklendi.";

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
    `"${artist.name}" sanatçısını silmek istediğine emin misin?\n\nBu işlem, veritabanındaki ilişkili şarkıları da silebilir.`
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

checkAdmin();
