
const db = window.supabase.createClient(
  window.AKORHANE_CONFIG.url,
  window.AKORHANE_CONFIG.key
);

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  loginButton.disabled = true;
  loginButton.textContent = "KONTROL EDİLİYOR...";
  loginMessage.textContent = "";

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      await db.auth.signOut();
      throw new Error("Bu hesap yönetici yetkisine sahip değil.");
    }

    loginMessage.textContent = "Giriş başarılı. Yönlendiriliyorsun...";

    window.location.href = "panel.html";

  } catch (error) {
    loginMessage.textContent =
      error.message || "Giriş sırasında bir hata oluştu.";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "GİRİŞ YAP";
  }
});
