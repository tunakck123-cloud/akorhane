
const db = window.supabase.createClient(
  window.AKORHANE_CONFIG.url,
  window.AKORHANE_CONFIG.key
);

const statusText = document.getElementById("adminStatus");
const logoutButton = document.getElementById("logoutButton");

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

    statusText.textContent = "Yönetici olarak giriş yaptın.";
  } catch (error) {
    console.error("Yönetici kontrolü:", error);
    statusText.textContent = "Yetki kontrolü başarısız. Tekrar giriş yap.";
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

checkAdmin();
