// ============================================
// 🔑 CONFIGURATION
// ============================================
const OMDB_API_KEY = "34c9f39a"; 
const PLACEHOLDER = "placeholder.png";

// PASTE YOUR FIREBASE CONFIG HERE (Safe to be public)
const firebaseConfig = {
    apiKey: "AIzaSyCvo9JWR2ghniwLyt5toNELTxM1b2rBPEU",
    authDomain: "morayio.firebaseapp.com",
    projectId: "morayio",
    storageBucket: "morayio.firebasestorage.app",
    messagingSenderId: "56539202739",
    appId: "1:56539202739:web:03a0987eeb068c43c1dcc6"
  };

// ============================================
// 📦 FIREBASE IMPORTS
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
const navAdd = document.getElementById("navAdd");
const navToWatch = document.getElementById("navToWatch");
const navWatched = document.getElementById("navWatched");
const userEmailLabel = document.getElementById("userEmailLabel");
const logoutBtn = document.getElementById("logoutBtn");

// Pages
const pageAdd = document.getElementById("pageAdd");
const pageToWatch = document.getElementById("pageToWatch");
const pageWatched = document.getElementById("pageWatched");

// Forms
const authForm = document.getElementById("authForm");
const authEmailInput = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");
const authErrorEl = document.getElementById("authError");
const authTabs = document.querySelectorAll(".tab");
const authSubmitBtn = document.getElementById("authSubmitBtn");
let authMode = "login";

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
function showModal(title, message) {
  if(!modalBackdrop) { alert(message); return; }
  modalContent.innerHTML = `
      <h3 style="margin-bottom:10px; font-size:1.2rem;">${title}</h3>
      <p style="color:#a1a1aa; margin-bottom:20px;">${message}</p>
      <button class="btn-solid full-width" onclick="document.getElementById('customModal').classList.remove('open')">Close</button>
  `;
  modalBackdrop.classList.add("open");
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
  suggestionsList.classList.add("hidden");
}

// ============================================
// 🔐 FIREBASE AUTH (The "Live Forever" Part)
// ============================================

// This listener runs automatically. Firebase remembers users forever.
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    showApp();
    await loadMoviesFromFirebase();
    renderMovies();
  } else {
    currentUser = null;
    showAuth();
  }
});

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
  authSubmitBtn.textContent = "Processing...";

  try {
    if (authMode === "signup") {
      await createUserWithEmailAndPassword(auth, email, password);
      // Auth listener will handle the transition
      showModal("Success", "Account created!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    authErrorEl.textContent = "Error: " + err.code.replace("auth/", "");
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = authMode === "login" ? "Access Account" : "Create Account";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

// ============================================
// 📦 FIREBASE DATABASE (Firestore)
// ============================================

async function loadMoviesFromFirebase() {
  if (!currentUser) return;
  
  // Get ONLY this user's movies
  const q = query(collection(db, "movies"), where("user_id", "==", currentUser.uid));
  
  try {
    const querySnapshot = await getDocs(q);
    const loaded = [];
    querySnapshot.forEach((doc) => {
      loaded.push({ id: doc.id, ...doc.data() });
    });
    // Client-side sort to avoid complex index setup
    movies = loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (e) {
    console.error("DB Error:", e);
  }
}

async function addMovie() {
  if (!currentUser) return;
  const title = titleInput.value.trim();
  const poster = posterPreview.src || PLACEHOLDER;

  if (!title) { showModal("Required", "Title is missing."); return; }
  
  addMovieBtn.disabled = true;
  addMovieBtn.textContent = "Saving...";

  const movieData = {
    user_id: currentUser.uid,
    title,
    year: yearInput.value ? parseInt(yearInput.value, 10) : null,
    genre: genreInput.value,
    type: typeSelect.value,
    review: reviewInput.value,
    watched: (statusSelect.value === "watched"),
    poster,
    createdAt: Date.now()
  };

  try {
      await addDoc(collection(db, "movies"), movieData);
      await loadMoviesFromFirebase();
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

async function toggleWatchedInBackend(id, currentStatus) {
  const ref = doc(db, "movies", id);
  await updateDoc(ref, { watched: !currentStatus });
  await loadMoviesFromFirebase(); 
  renderMovies();
}

async function deleteMovieInBackend(id) {
  if(!confirm("Delete this entry?")) return;
  const ref = doc(db, "movies", id);
  await deleteDoc(ref);
  await loadMoviesFromFirebase(); 
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
    const card = document.createElement("div");
    card.className = "movie-card";
    
    // Actions Overlay
    const actions = document.createElement("div");
    actions.className = "movie-actions";
    
    const checkBtn = document.createElement("div");
    checkBtn.className = "action-icon-btn";
    checkBtn.innerHTML = movie.watched ? "↩" : "✓";
    checkBtn.onclick = (e) => { e.stopPropagation(); toggleWatchedInBackend(movie.id, movie.watched); };
    
    const delBtn = document.createElement("div");
    delBtn.className = "action-icon-btn";
    delBtn.innerHTML = "×";
    delBtn.onclick = (e) => { e.stopPropagation(); deleteMovieInBackend(movie.id); };
    
    actions.appendChild(checkBtn);
    actions.appendChild(delBtn);

    const img = document.createElement("img");
    img.src = movie.poster || PLACEHOLDER;
    img.onerror = () => { img.src = PLACEHOLDER; };

    const info = document.createElement("div");
    info.className = "movie-info";
    info.innerHTML = `<div class="movie-title">${movie.title}</div><div class="movie-meta">${movie.year || ''}</div>`;

    card.appendChild(actions);
    card.appendChild(img);
    card.appendChild(info);
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
// ✨ MAGIC PICKER (Google Gemini)
// ============================================
function openMagicPicker() {
    const unwatched = movies.filter(m => !m.watched);
    const hasMovies = unwatched.length > 0;
    
    modalContent.classList.add("magic-theme");
    modalContent.innerHTML = `
      <div class="magic-header">
        <span class="magic-icon-glow">✨</span>
        <h3>Recommendation</h3>
        <p class="magic-subtitle">${hasMovies ? `Analyzing ${unwatched.length} items.` : "Database empty."}</p>
      </div>
      <div class="magic-input-wrapper">
        <label class="magic-label">Constraint / Mood</label>
        <input type="text" id="magicInput" class="magic-input" placeholder="${hasMovies ? 'e.g. Short & Funny' : 'e.g. 90s Thriller'}">
      </div>
      <button id="magicRunBtn" class="btn-magic">Consult AI</button>
      <div id="magicResult" class="magic-result-container"></div>
    `;
    modalBackdrop.classList.add("open");

    setTimeout(() => {
        document.getElementById("magicRunBtn").onclick = () => runMagicPicker(hasMovies, unwatched);
    }, 100);
}

async function runMagicPicker(hasMovies, list) {
    const input = document.getElementById("magicInput").value || "Something good";
    const resDiv = document.getElementById("magicResult");
    const btn = document.getElementById("magicRunBtn");

    btn.disabled = true;
    btn.innerHTML = "Processing...";
    resDiv.innerHTML = "";

    try {
        let prompt = "";
        
        if (hasMovies) {
            const context = list.map(m => `- ${m.title} (${m.year}, ${m.genre})`).join("\n");
            prompt = `I have this movie list:\n${context}\n\nMy constraint is: "${input}"\n\nPick the SINGLE best movie from the list. Return in this format: Title | Vibe | Reason`;
        } else {
            prompt = `Suggest ONE movie for: "${input}". Return in this format: Title | Vibe | Reason`;
        }

        // CALL SERVER API (Secure Bridge)
        const response = await fetch("/api/ai", {
            method: "POST",
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();
        const raw = data.result || "No response";
        
        const parts = raw.split("|");
        const title = parts[0] || raw;
        const vibe = parts[1] || "Top Choice";
        const reason = parts[2] || "";

        resDiv.innerHTML = `
            <div class="magic-recommendation">
                <span class="rec-title">${title}</span>
                <div style="background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:10px; display:inline-block; font-size:12px; margin:5px 0;">${vibe}</div>
                <p class="rec-desc">${reason}</p>
            </div>
        `;
        btn.innerHTML = "Again";

    } catch (e) {
        console.error(e);
        resDiv.innerHTML = "AI Error.";
    } finally {
        btn.disabled = false;
    }
}

// ============================================
// 🤖 AUTO-FILL AI (Google Gemini)
// ============================================
async function generateAIReview() {
    const t = titleInput.value;
    if(!t) return;
    
    aiGenerateBtn.textContent = "...";
    try {
        const resp = await fetch("/api/ai", {
            method: "POST",
            body: JSON.stringify({ 
                prompt: `Rate 1-10 & 1 sentence reason for movie "${t}". Format: Rating: X/10 - Reason.` 
            })
        });
        const d = await resp.json();
        reviewInput.value = d.result;
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