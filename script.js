// ============================================
// 🔑 CONFIGURATION
// ============================================
const OMDB_API_KEY = "34c9f39a"; 
const PLACEHOLDER = "placeholder.png";

// NOTE: Groq Key is removed. It is now stored in Vercel Settings.

const SUPABASE_URL = "https://gubmquvfnuyxeuvyeexa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Ym1xdXZmbnV5eGV1dnllZXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDU4NTUsImV4cCI6MjA4MDE4MTg1NX0.hnh8orWhVOFWu9W74Y2fq-qTgc39ocb4TuMcTueCLMs";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// 🏗️ APP STATE
// ============================================
let currentUser = null;
let movies = [];
let searchTimeout = null;

// Layout
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const appHeader = document.getElementById("appHeader"); 

// Nav
const navAdd = document.getElementById("navAdd");
const navToWatch = document.getElementById("navToWatch");
const navWatched = document.getElementById("navWatched");
const logoutBtn = document.getElementById("logoutBtn");
const userEmailLabel = document.getElementById("userEmailLabel");

// Pages
const pageAdd = document.getElementById("pageAdd");
const pageToWatch = document.getElementById("pageToWatch");
const pageWatched = document.getElementById("pageWatched");

// Auth Form
const authForm = document.getElementById("authForm");
const authEmailInput = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");
const authErrorEl = document.getElementById("authError");
const authTabs = document.querySelectorAll(".tab");
const authSubmitBtn = document.getElementById("authSubmitBtn");
let authMode = "login";

// App Forms
const searchInput = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestionsList");
const titleInput = document.getElementById("titleInput");
const yearInput = document.getElementById("yearInput");
const genreInput = document.getElementById("genreInput");
const typeSelect = document.getElementById("typeSelect");
const statusSelect = document.getElementById("statusSelect");
const reviewInput = document.getElementById("reviewInput");
const posterPreview = document.getElementById("posterPreview");
const addMovieBtn = document.getElementById("addMovieBtn");
const aiGenerateBtn = document.getElementById("aiGenerateBtn");
const magicPickBtn = document.getElementById("magicPickBtn"); 

// Lists
const unwatchedListEl = document.getElementById("unwatchedList");
const watchedListEl = document.getElementById("watchedList");
const unwatchedCountEl = document.getElementById("unwatchedCount");
const watchedCountEl = document.getElementById("watchedCount");

// Modal
const modalBackdrop = document.getElementById("customModal");
const modalContent = document.getElementById("modalContent");

if(posterPreview) {
    posterPreview.src = PLACEHOLDER;
    posterPreview.onerror = () => { posterPreview.src = PLACEHOLDER; };
}

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

// Minimal Standard Modal
function showModal(title, message) {
  if(!modalBackdrop) { alert(message); return; }
  modalContent.innerHTML = `
      <h3 style="margin-bottom:10px; font-size:1.2rem;">${title}</h3>
      <p style="color:#a1a1aa; margin-bottom:20px;">${message}</p>
      <button class="btn-solid full-width" onclick="closeModal()">Close</button>
  `;
  modalBackdrop.classList.add("open");
}

function closeModal() {
  if(modalBackdrop) modalBackdrop.classList.remove("open");
}

if(modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
}

function showPage(page) {
  pageAdd.classList.add("hidden");
  pageToWatch.classList.add("hidden");
  pageWatched.classList.add("hidden");
  navAdd.classList.remove("active");
  navToWatch.classList.remove("active");
  navWatched.classList.remove("active");

  if (page === "add") { pageAdd.classList.remove("hidden"); navAdd.classList.add("active"); } 
  else if (page === "toWatch") { pageToWatch.classList.remove("hidden"); navToWatch.classList.add("active"); } 
  else if (page === "watched") { pageWatched.classList.remove("hidden"); navWatched.classList.add("active"); }
}

function showApp() {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  appHeader.classList.remove("hidden"); 
  if (currentUser && currentUser.email) { 
      userEmailLabel.textContent = currentUser.email; 
  }
  showPage("add");
}

function showAuth() {
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
  appHeader.classList.add("hidden");
}

function clearForm() {
  searchInput.value = "";
  titleInput.value = "";
  yearInput.value = "";
  genreInput.value = "";
  reviewInput.value = "";
  typeSelect.value = "movie";
  statusSelect.value = "toWatch";
  posterPreview.src = PLACEHOLDER;
  hideSuggestions();
}

// ============================================
// 🔐 AUTHENTICATION
// ============================================
async function checkUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data.user) {
    currentUser = null;
    showAuth();
    movies = [];
    return;
  }
  currentUser = data.user;
  showApp();
  await loadMoviesFromSupabase();
  renderMovies();
}

authTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    authTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    authMode = tab.dataset.mode;
    authSubmitBtn.textContent = authMode === "login" ? "Access Account" : "Create Account";
    authErrorEl.textContent = "";
  });
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authErrorEl.textContent = "";
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) return;
  
  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = "Verifying...";

  try {
    if (authMode === "signup") {
      const { error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      showModal("Verify Email", "We sent a confirmation link to " + email);
      authMode = "login";
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      authEmailInput.value = "";
      authPasswordInput.value = "";
      await checkUser();
    }
  } catch (err) {
    authErrorEl.textContent = err.message;
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = authMode === "login" ? "Access Account" : "Create Account";
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  showAuth();
  movies = [];
});

// ============================================
// 📦 DATABASE LOGIC
// ============================================
async function loadMoviesFromSupabase() {
  if (!currentUser) return;
  const { data, error } = await supabaseClient
    .from("movies")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (!error) movies = data || [];
}

async function addMovie() {
  if (!currentUser) return;
  const title = titleInput.value.trim();
  const poster = posterPreview.src || PLACEHOLDER;

  if (!title) { showModal("Required", "Title is missing."); return; }
  
  addMovieBtn.disabled = true;
  addMovieBtn.textContent = "Saving...";

  const movieData = {
    user_id: currentUser.id,
    title,
    year: yearInput.value ? parseInt(yearInput.value, 10) : null,
    genre: genreInput.value,
    type: typeSelect.value,
    review: reviewInput.value,
    watched: (statusSelect.value === "watched"),
    poster
  };

  try {
      const { error } = await supabaseClient.from("movies").insert([movieData]);
      if (error) throw error;
      await loadMoviesFromSupabase();
      renderMovies();
      clearForm();
      showModal("Saved", "Entry added to archive.");
  } catch (err) {
      alert("Error: " + err.message);
  } finally {
      addMovieBtn.disabled = false;
      addMovieBtn.textContent = "Save Entry";
  }
}

async function toggleWatchedInBackend(id, newWatched) {
  await supabaseClient.from("movies").update({ watched: newWatched }).eq("id", id);
  await loadMoviesFromSupabase(); 
  renderMovies();
}

async function deleteMovieInBackend(id) {
  if(!confirm("Delete this entry?")) return;
  await supabaseClient.from("movies").delete().eq("id", id);
  await loadMoviesFromSupabase(); 
  renderMovies();
}

// ============================================
// 🎨 RENDER (Minimal Grid)
// ============================================
function renderMovies() {
  unwatchedListEl.innerHTML = "";
  watchedListEl.innerHTML = "";
  let uC = 0, wC = 0;

  movies.forEach(movie => {
    // New Minimal Card Structure
    const card = document.createElement("div");
    card.className = "movie-card";
    
    // Actions Overlay (Hover)
    const actions = document.createElement("div");
    actions.className = "movie-actions";
    
    // Toggle Button
    const checkBtn = document.createElement("div");
    checkBtn.className = "action-icon-btn";
    checkBtn.innerHTML = movie.watched ? "↩" : "✓";
    checkBtn.title = movie.watched ? "Mark Unwatched" : "Mark Watched";
    checkBtn.onclick = (e) => { e.stopPropagation(); toggleWatchedInBackend(movie.id, !movie.watched); };
    
    // Delete Button
    const delBtn = document.createElement("div");
    delBtn.className = "action-icon-btn";
    delBtn.innerHTML = "×";
    delBtn.title = "Delete";
    delBtn.onclick = (e) => { e.stopPropagation(); deleteMovieInBackend(movie.id); };
    
    actions.appendChild(checkBtn);
    actions.appendChild(delBtn);

    const img = document.createElement("img");
    img.src = movie.poster || PLACEHOLDER;
    img.onerror = () => { img.src = PLACEHOLDER; };

    const info = document.createElement("div");
    info.className = "movie-info";
    info.innerHTML = `
      <div class="movie-title">${movie.title}</div>
      <div class="movie-meta">${movie.year || ''}</div>
    `;

    card.appendChild(actions);
    card.appendChild(img);
    card.appendChild(info);
    
    // Click to see review
    card.onclick = () => { if(movie.review) showModal("Notes", movie.review); };

    if (movie.watched) { watchedListEl.appendChild(card); wC++; } 
    else { unwatchedListEl.appendChild(card); uC++; }
  });

  unwatchedCountEl.textContent = uC + " entries";
  watchedCountEl.textContent = wC + " entries";
  
  if(uC === 0) unwatchedListEl.innerHTML = `<div style="color:#52525b; grid-column:1/-1;">List is empty.</div>`;
  if(wC === 0) watchedListEl.innerHTML = `<div style="color:#52525b; grid-column:1/-1;">No history.</div>`;
}

// ============================================
// ✨ MAGIC PICKER (Professional Minimal)
// ============================================
function openMagicPicker() {
    const unwatched = movies.filter(m => !m.watched);
    const hasMovies = unwatched.length > 0;
    
    let html = `
      <div class="magic-title">Recommendation Engine</div>
      <p class="magic-desc">${hasMovies ? `Analyzing ${unwatched.length} items in your list.` : "Database empty. Suggesting external titles."}</p>
      
      <input type="text" id="magicInput" class="magic-input-field" placeholder="${hasMovies ? 'e.g. 90 mins, Sci-Fi' : 'e.g. 90s Thriller'}" autocomplete="off">
      
      <button id="magicRunBtn" class="btn-solid full-width">Analyze & Pick</button>
      <div id="magicResult" class="result-box"></div>
    `;

    modalContent.innerHTML = html;
    modalBackdrop.classList.add("open");

    setTimeout(() => {
        const btn = document.getElementById("magicRunBtn");
        const input = document.getElementById("magicInput");
        input.focus();
        btn.onclick = () => runMagicPicker(hasMovies, unwatched);
        input.addEventListener("keypress", (e) => { if (e.key === "Enter") btn.click(); });
    }, 100);
}

async function runMagicPicker(hasMovies, list) {
    const input = document.getElementById("magicInput").value || "Best option";
    const resDiv = document.getElementById("magicResult");
    const btn = document.getElementById("magicRunBtn");

    btn.disabled = true;
    btn.textContent = "Processing...";
    resDiv.innerHTML = "";

    try {
        let prompt = "";
        let system = "Return result in format: Title | Vibe (3 words) | Reason (1 sentence). Do not speak extra.";
        
        if (hasMovies) {
            const context = list.map(m => `- ${m.title} (${m.year}, ${m.genre})`).join("\n");
            prompt = `LIST:\n${context}\nCONSTRAINT: "${input}"\nPick one movie from LIST that fits CONSTRAINT.`;
        } else {
            prompt = `Suggest one movie for: "${input}".`;
        }

        // 🚀 SECURE CALL TO VERCEL API (No Key Exposed)
        const resp = await fetch("/api/ai", {
            method: "POST",
            body: JSON.stringify({ prompt, system })
        });
        
        const data = await resp.json();
        const raw = data.choices[0].message.content;
        
        // Clean up response if AI talks too much
        let cleanRaw = raw;
        if (raw.includes(":")) {
             const split = raw.split(":");
             if (split[split.length - 1].includes("|")) cleanRaw = split[split.length - 1].trim();
        }

        const parts = cleanRaw.split("|");
        
        resDiv.innerHTML = `
            <div class="result-tag">Top Result</div>
            <div class="result-main">${parts[0] || raw}</div>
            <div class="result-vibe">${parts[1] || "Recommended"}</div>
            <div class="result-reason">${parts[2] || "Matches criteria."}</div>
        `;
        btn.textContent = "Retry";

    } catch (e) {
        console.error(e);
        resDiv.innerHTML = "AI Error (Check Vercel Logs).";
    } finally {
        btn.disabled = false;
    }
}

// ============================================
// 🤖 AUTO-FILL AI
// ============================================
async function generateAIReview() {
    const t = titleInput.value;
    if(!t) return;
    
    aiGenerateBtn.textContent = "...";
    try {
        // 🚀 SECURE CALL TO VERCEL API
        const resp = await fetch("/api/ai", {
            method: "POST",
            body: JSON.stringify({ 
                prompt: `Rate 1-10 & 1 sentence reason for movie "${t}". Format: Rating: X/10 - Reason.`,
                system: "You are a movie critic."
            })
        });
        const d = await resp.json();
        reviewInput.value = d.choices[0].message.content;
    } catch(e){}
    aiGenerateBtn.textContent = "AI Auto-Fill";
}

// ============================================
// 🔎 SEARCH
// ============================================
function hideSuggestions() { suggestionsList.classList.add("hidden"); }
async function fetchSuggestions(q) {
  try { 
      const r = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${q}`); 
      const d = await r.json(); 
      if(d.Search) {
          suggestionsList.innerHTML = d.Search.slice(0,5).map(m => 
              `<div class="suggestion-item" onclick="loadMovie('${m.imdbID}')">
                 <span class="suggestion-title">${m.Title}</span>
                 <span class="suggestion-meta">${m.Year}</span>
               </div>`
          ).join("");
          suggestionsList.classList.remove("hidden");
      } else hideSuggestions();
  } catch(e) { hideSuggestions(); }
}
async function loadMovie(id) {
    hideSuggestions();
    const r = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${id}`);
    const d = await r.json();
    titleInput.value = d.Title; yearInput.value = parseInt(d.Year); typeSelect.value = d.Type; genreInput.value = d.Genre;
    posterPreview.src = (d.Poster && d.Poster !== "N/A") ? d.Poster : PLACEHOLDER;
}

searchInput.addEventListener("input", () => {
    if(searchTimeout) clearTimeout(searchTimeout);
    if(searchInput.value.length < 3) return hideSuggestions();
    searchTimeout = setTimeout(() => fetchSuggestions(searchInput.value), 350);
});
document.addEventListener("click", e => { if(!e.target.closest(".search-wrapper")) hideSuggestions(); });

// Init
addMovieBtn.addEventListener("click", (e) => { e.preventDefault(); addMovie(); });
navAdd.addEventListener("click", () => showPage("add"));
navToWatch.addEventListener("click", () => showPage("toWatch"));
navWatched.addEventListener("click", () => showPage("watched"));
if(aiGenerateBtn) aiGenerateBtn.addEventListener("click", generateAIReview);
if(magicPickBtn) magicPickBtn.addEventListener("click", openMagicPicker);

showAuth();
checkUser();