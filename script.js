// 1) Initialize the client
// Replace with your actual values from Supabase Settings -> API
const SUPABASE_URL = "https://hjpjtufobzttssidfexf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcGp0dWZvYnp0dHNzaWRmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTY0OTQsImV4cCI6MjA3OTM5MjQ5NH0.xAAAGortVAhOIeKoMyWNvJDrc0kr0FjfTzn3V99wFS0";

const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) DOM refs
const form = document.getElementById("thoughtForm");
const textEl = document.getElementById("thoughtText");
const catEl = document.getElementById("thoughtCategory");
const filterEl = document.getElementById("filter");
const thoughtsDiv = document.getElementById("thoughts");

// 3) Insert a new thought
async function postThought(text, category) {
  console.log("Sending to Supabase:", { text, category }); // DEBUG

  const { data, error } = await supabase
    .from("thoughts")
    .insert([{ text, category }]);

  console.log("Insert result:", { data, error }); // DEBUG

  if (error) {
    console.error("Insert error:", error);
    return { ok: false, error };
  }

  return { ok: true, data };
}

// 4) Fetch thoughts, optionally filtered by category
async function loadThoughts(category = "") {
  let query = supabase
    .from("thoughts")
    .select("*")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) {
    console.error("Fetch error:", error);
    thoughtsDiv.innerHTML = "<p style='color:red'>Load failed. Check console.</p>";
    return;
  }

  // render
  thoughtsDiv.innerHTML = (data || [])
    .map(t => `<div style="padding:8px;border-bottom:1px solid #eee;">
                  <small>${new Date(t.created_at).toLocaleString()}</small>
                  <p><strong>${t.category || "uncategorized"}</strong>: ${escapeHtml(t.text)}</p>
                </div>`)
    .join("");
}

// small helper for safety
function escapeHtml(s){
  return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

// 5) Wire the form
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = textEl.value.trim();
  const category = catEl.value.trim() || null;
  if (!text) return alert("Please write a thought.");

  const result = await postThought(text, category);
  if (result.ok) {
    textEl.value = "";
    catEl.value = "";
    loadThoughts(filterEl.value);
  } else {
    alert("Failed to post. See console.");
  }
});

// 6) Wire the filter
filterEl.addEventListener("change", () => {
  loadThoughts(filterEl.value);
});

// 7) Initial load
loadThoughts();
