// ============================================
// 🔑 CONFIGURATION
// ============================================
const OMDB_API_KEY = "34c9f39a"; 
const PLACEHOLDER = "placeholder.png";

// 🔥 PASTE YOUR FIREBASE CONFIG HERE 🔥
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
// 1. UPDATE THE IMPORTS AT THE TOP
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// State
let currentUser = null;
let movies = [];
let searchTimeout = null;

// UI
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const appHeader = document.getElementById("appHeader");
const userEmailLabel = document.getElementById("userEmailLabel");

// Inputs
const searchInput = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestionsList");
const titleInput = document.getElementById("titleInput");
const yearInput = document.getElementById("yearInput");
const genreInput = document.getElementById("genreInput");
const typeSelect = document.getElementById("typeSelect");
const statusSelect = document.getElementById("statusSelect");
const reviewInput = document.getElementById("reviewInput");
const posterPreview = document.getElementById("posterPreview");

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
function showModal(title, msg) {
    if(!modalBackdrop) { alert(msg); return; }
    modalContent.innerHTML = `
      <div class="magic-title">${title}</div>
      <p style="color:#a1a1aa; margin-bottom:20px;">${msg}</p>
      <button class="btn-solid full-width" onclick="document.getElementById('customModal').classList.remove('open')">Close</button>
    `;
    modalBackdrop.classList.add("open");
}

function showPage(pageId) {
    document.querySelectorAll(".view-section").forEach(el => el.classList.add("hidden"));
    document.getElementById(pageId).classList.remove("hidden");
    
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    if(pageId === "pageAdd") document.getElementById("navAdd").classList.add("active");
    if(pageId === "pageToWatch") document.getElementById("navToWatch").classList.add("active");
    if(pageId === "pageWatched") document.getElementById("navWatched").classList.add("active");
}

function showApp() {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    appHeader.classList.remove("hidden");
    if(currentUser) userEmailLabel.textContent = currentUser.email;
    showPage("pageAdd");
}

function showAuth() {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    appHeader.classList.add("hidden");
}

function clearForm() {
    titleInput.value = ""; yearInput.value = ""; genreInput.value = ""; reviewInput.value = "";
    searchInput.value = ""; posterPreview.src = PLACEHOLDER;
    suggestionsList.classList.add("hidden");
}

// ============================================
// 🔐 AUTH
// ============================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        showApp();
        await loadMovies();
        renderMovies();
    } else {
        currentUser = null;
        showAuth();
    }
});

let authMode = "login";
document.querySelectorAll(".tab").forEach(t => t.onclick = (e) => {
    e.preventDefault();
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    authMode = t.dataset.mode;
    document.getElementById("authSubmitBtn").textContent = authMode === "login" ? "Access Account" : "Create Account";
});

document.getElementById("authForm").onsubmit = async (e) => {
    e.preventDefault();
    const em = document.getElementById("authEmail").value;
    const pw = document.getElementById("authPassword").value;
    const err = document.getElementById("authError");
    err.textContent = "";
    
    try {
        document.getElementById("authSubmitBtn").disabled = true;
        if(authMode === "signup") {
            await createUserWithEmailAndPassword(auth, em, pw);
            showModal("Success", "Welcome!");
        } else {
            await signInWithEmailAndPassword(auth, em, pw);
        }
    } catch(error) { err.textContent = error.message.replace("Firebase:", ""); }
    finally { document.getElementById("authSubmitBtn").disabled = false; }
};

const googleBtn = document.getElementById("googleBtn");

if (googleBtn) {
    googleBtn.onclick = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // No need to call showApp(), onAuthStateChanged will detect it automatically
        } catch (error) {
            document.getElementById("authError").textContent = error.message;
        }
    };
}

document.getElementById("logoutBtn").onclick = () => signOut(auth);

// ============================================
// 📦 DATABASE
// ============================================
async function loadMovies() {
    if(!currentUser) return;
    const q = query(collection(db, "movies"), where("user_id", "==", currentUser.uid));
    try {
        const snap = await getDocs(q);
        let loaded = [];
        snap.forEach(d => loaded.push({id: d.id, ...d.data()}));
        movies = loaded.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch(e) { console.error(e); }
}

async function addMovie() {
    if(!currentUser) return;
    const t = titleInput.value.trim();
    if(!t) { showModal("Error", "Title required"); return; }
    
    document.getElementById("addMovieBtn").disabled = true;
    document.getElementById("addMovieBtn").textContent = "Saving...";

    try {
        await addDoc(collection(db, "movies"), {
            user_id: currentUser.uid,
            title: t,
            year: yearInput.value,
            genre: genreInput.value,
            type: typeSelect.value,
            review: reviewInput.value,
            watched: (statusSelect.value === "watched"),
            poster: posterPreview.src,
            createdAt: Date.now()
        });
        await loadMovies(); renderMovies(); clearForm();
        showModal("Saved", "Entry added.");
    } catch(e) { alert(e.message); }
    finally { 
        document.getElementById("addMovieBtn").disabled = false;
        document.getElementById("addMovieBtn").textContent = "Save Entry";
    }
}

// ⚠️ EXPOSED GLOBALS FOR HTML ONCLICK ⚠️
window.toggleWatched = async (id, status) => {
    await updateDoc(doc(db, "movies", id), { watched: !status });
    await loadMovies(); renderMovies();
};

window.deleteMovie = async (id) => {
    if(!confirm("Delete?")) return;
    await deleteDoc(doc(db, "movies", id));
    await loadMovies(); renderMovies();
};

// ============================================
// 🎨 RENDER (With Zinc Styling)
// ============================================
function renderMovies() {
    const ul = document.getElementById("unwatchedList");
    const wl = document.getElementById("watchedList");
    ul.innerHTML = ""; wl.innerHTML = "";
    
    let u=0, w=0;
    
    movies.forEach(m => {
        const div = document.createElement("div");
        div.className = "movie-card";
        div.innerHTML = `
            <div class="movie-actions">
                <div class="action-icon-btn" onclick="window.toggleWatched('${m.id}', ${m.watched})">${m.watched ? '↩' : '✓'}</div>
                <div class="action-icon-btn" onclick="window.deleteMovie('${m.id}')">×</div>
            </div>
            <img src="${m.poster || PLACEHOLDER}" onerror="this.src='${PLACEHOLDER}'">
            <div class="movie-info">
                <div class="movie-title">${m.title}</div>
                <div class="movie-meta">${m.year || ''}</div>
            </div>
        `;
        div.onclick = (e) => { if(!e.target.closest('.action-icon-btn') && m.review) showModal("Notes", m.review); };
        
        if(m.watched) { wl.appendChild(div); w++; } else { ul.appendChild(div); u++; }
    });
    
    document.getElementById("unwatchedCount").textContent = u + " entries";
    document.getElementById("watchedCount").textContent = w + " entries";
}

// ============================================
// ✨ AI LOGIC (Connects to /api/ai)
// ============================================
document.getElementById("magicPickBtn").onclick = () => {
    const unwatched = movies.filter(m => !m.watched);
    const hasData = unwatched.length > 0;
    
    modalContent.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;">
          <div class="magic-title" style="margin:0;">Smart Pick</div>
          <button onclick="document.getElementById('customModal').classList.remove('open')" style="background:none; border:none; color:#71717a; font-size:24px; line-height:1; cursor:pointer; padding:0;">&times;</button>
      </div>
      
      <p class="magic-desc">${hasData ? "Analyzing your list..." : "Database empty."}</p>
      
      <input type="text" id="magicInput" class="magic-input-field" placeholder="${hasData ? 'e.g. 90 mins, Sci-Fi' : 'e.g. 90s Thriller'}">
      
      <button id="runAiBtn" class="btn-solid full-width">Consult AI</button>
      <div id="aiRes" class="result-box"></div>
    `;
    modalBackdrop.classList.add("open");

    // Focus input for better UX
    setTimeout(() => {
        document.getElementById("magicInput").focus();
        document.getElementById("runAiBtn").onclick = () => runAI(hasData, unwatched);
    }, 100);
};

async function runAI(hasData, list) {
    const input = document.getElementById("magicInput").value || "Best choice";
    const resDiv = document.getElementById("aiRes");
    const btn = document.getElementById("runAiBtn");
    
    btn.disabled = true; btn.textContent = "Thinking...";
    resDiv.innerHTML = "";

    try {
        let prompt = hasData 
            ? `My List:\n${list.map(m=>`- ${m.title} (${m.year})`).join('\n')}\nConstraint: "${input}". Pick ONE. Return: Title | Vibe | Reason`
            : `Suggest ONE movie for: "${input}". Return: Title | Vibe | Reason`;

        // 🚀 SECURE SERVER CALL (POST REQUEST)
        const r = await fetch("/api/ai", { 
            method: "POST",
            headers: { "Content-Type": "application/json" }, // <-- Header Fix
            body: JSON.stringify({ prompt }) 
        });
        
        const d = await r.json();
        if (d.error) throw new Error(d.error);

        const parts = (d.result || "").split("|");
        resDiv.innerHTML = `
            <div class="result-tag">Top Result</div>
            <div class="result-main">${parts[0]||d.result}</div>
            <div class="result-vibe">${parts[1]||"Recommended"}</div>
            <div class="result-reason">${parts[2]||""}</div>
        `;
        btn.textContent = "Retry";
    } catch(e) { 
        console.error(e);
        resDiv.textContent = "Error: " + e.message; 
    } 
    finally { btn.disabled = false; }
}

document.getElementById("aiGenerateBtn").onclick = async () => {
    const t = titleInput.value;
    if(!t) return;
    const btn = document.getElementById("aiGenerateBtn");
    btn.textContent = "...";
    try {
        // 🚀 SECURE SERVER CALL (POST REQUEST)
        const r = await fetch("/api/ai", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, // <-- Header Fix
            body: JSON.stringify({ prompt: `Give Rating out of 10, Write 1 sentence review for "${t}"` }) 
        });
        const d = await r.json();
        if(d.result) reviewInput.value = d.result;
    } catch(e){ console.error(e); }
    btn.textContent = "AI Auto-Fill";
};

// ============================================
// 🔎 SEARCH FIX
// ============================================
searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    if(searchInput.value.length < 3) { suggestionsList.classList.add("hidden"); return; }
    searchTimeout = setTimeout(async () => {
        try {
            const r = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${searchInput.value}`);
            const d = await r.json();
            if(d.Search) {
                suggestionsList.innerHTML = d.Search.slice(0,5).map(m => 
                    `<div class="suggestion-item" onclick="window.loadMovie('${m.imdbID}')">
                        <span class="suggestion-title">${m.Title}</span>
                        <span class="suggestion-meta">${m.Year}</span>
                     </div>`
                ).join("");
                suggestionsList.classList.remove("hidden");
            }
        } catch(e){}
    }, 350);
});

// EXPOSED GLOBAL LOAD FUNCTION
window.loadMovie = async (id) => {
    suggestionsList.classList.add("hidden");
    const r = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${id}`);
    const d = await r.json();
    titleInput.value = d.Title; yearInput.value = parseInt(d.Year); typeSelect.value = d.Type === 'series'?'series':'movie'; genreInput.value = d.Genre;
    posterPreview.src = (d.Poster && d.Poster !== "N/A") ? d.Poster : PLACEHOLDER;
};

// Nav
document.getElementById("navAdd").onclick = () => showPage("pageAdd");
document.getElementById("navToWatch").onclick = () => showPage("pageToWatch");
document.getElementById("navWatched").onclick = () => showPage("pageWatched");
document.getElementById("addMovieBtn").onclick = (e) => { e.preventDefault(); addMovie(); };