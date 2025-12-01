// Moray script using Supabase backend

// OMDb key and placeholder
const OMDB_API_KEY = "34c9f39a"; // change if you have another key
const PLACEHOLDER = "placeholder.png";

// Supabase configuration - put your actual values here
const SUPABASE_URL = "https://gubmquvfnuyxeuvyeexa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Ym1xdXZmbnV5eGV1dnllZXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDU4NTUsImV4cCI6MjA4MDE4MTg1NX0.hnh8orWhVOFWu9W74Y2fq-qTgc39ocb4TuMcTueCLMs";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let movies = [];
let searchTimeout = null;

// Auth elements
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const appHeader = document.getElementById("appHeader");

const authForm = document.getElementById("authForm");
const authEmailInput = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");
const authErrorEl = document.getElementById("authError");
const authTabs = document.querySelectorAll(".auth-tab");
const authSubmitBtn = document.getElementById("authSubmitBtn");

const logoutBtn = document.getElementById("logoutBtn");
const userEmailLabel = document.getElementById("userEmailLabel");

// Navigation buttons and pages
const navAdd = document.getElementById("navAdd");
const navToWatch = document.getElementById("navToWatch");
const navWatched = document.getElementById("navWatched");

const pageAdd = document.getElementById("pageAdd");
const pageToWatch = document.getElementById("pageToWatch");
const pageWatched = document.getElementById("pageWatched");

let authMode = "login";

// Movie form and UI elements
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

const unwatchedListEl = document.getElementById("unwatchedList");
const watchedListEl = document.getElementById("watchedList");
const unwatchedCountEl = document.getElementById("unwatchedCount");
const watchedCountEl = document.getElementById("watchedCount");

// Poster placeholder
posterPreview.src = PLACEHOLDER;
posterPreview.onerror = () => {
  posterPreview.src = PLACEHOLDER;
};

// Navigation between pages
function showPage(page) {
  pageAdd.classList.add("hidden");
  pageToWatch.classList.add("hidden");
  pageWatched.classList.add("hidden");

  navAdd.classList.remove("active-tab");
  navToWatch.classList.remove("active-tab");
  navWatched.classList.remove("active-tab");

  if (page === "add") {
    pageAdd.classList.remove("hidden");
    navAdd.classList.add("active-tab");
  } else if (page === "toWatch") {
    pageToWatch.classList.remove("hidden");
    navToWatch.classList.add("active-tab");
  } else if (page === "watched") {
    pageWatched.classList.remove("hidden");
    navWatched.classList.add("active-tab");
  }
}

// Show app vs auth
function showApp() {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  appHeader.classList.remove("hidden");
  logoutBtn.style.display = "inline-flex";

  if (currentUser && currentUser.email) {
    const username = currentUser.email.split("@")[0];
    userEmailLabel.textContent = username;
  } else {
    userEmailLabel.textContent = "";
  }

  showPage("add");
}
function showAuth() {
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
  appHeader.classList.add("hidden");
  logoutBtn.style.display = "none";
  userEmailLabel.textContent = "";
}

// Check current user on load
async function checkUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    currentUser = null;
    showAuth();
    movies = [];
    renderMovies();
    return;
  }

  currentUser = data.user;
  showApp();
  await loadMoviesFromSupabase();
  renderMovies();
}

// Auth tab switching
authTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    authTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    authMode = tab.dataset.mode;
    authSubmitBtn.textContent = authMode === "login" ? "Login" : "Sign up";
    authErrorEl.textContent = "";
  });
});

// Auth form submit
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authErrorEl.textContent = "";

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (!email || !password) {
    authErrorEl.textContent = "Please fill in both fields.";
    return;
  }

  try {
    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }

    authEmailInput.value = "";
    authPasswordInput.value = "";
    await checkUser();
  } catch (err) {
    console.error(err);
    authErrorEl.textContent = err.message || "Authentication error.";
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  currentUser = null;
  showAuth();
  movies = [];
  renderMovies();
});

// Navigation button events
navAdd.addEventListener("click", () => showPage("add"));
navToWatch.addEventListener("click", () => showPage("toWatch"));
navWatched.addEventListener("click", () => showPage("watched"));

// Load movies from Supabase
async function loadMoviesFromSupabase() {
  if (!currentUser) {
    movies = [];
    return;
  }

  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load movies", error);
    movies = [];
  } else {
    movies = data || [];
  }
}

// Add movie
async function addMovie() {
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }

  const title = titleInput.value.trim();
  const year = yearInput.value.trim();
  const genre = genreInput.value.trim();
  const type = typeSelect.value;
  const review = reviewInput.value.trim();
  const status = statusSelect.value;
  const watched = status === "watched";
  const poster = posterPreview.src || PLACEHOLDER;

  if (!title) {
    alert("Please enter a title first.");
    return;
  }

  const movieData = {
    user_id: currentUser.id,
    title,
    year: year ? parseInt(year, 10) : null,
    genre,
    type,
    review,
    watched,
    poster
  };

  const { error } = await supabase.from("movies").insert([movieData]);

  if (error) {
    console.error("Error saving movie", error);
    alert("Could not save movie, please try again.");
    return;
  }

  await loadMoviesFromSupabase();
  renderMovies();
  clearForm();
}

// Update watched status
async function toggleWatchedInBackend(id, newWatched) {
  const { error } = await supabase
    .from("movies")
    .update({ watched: newWatched })
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Failed to update watched status", error);
    return;
  }

  await loadMoviesFromSupabase();
  renderMovies();
}

// Delete movie
async function deleteMovieInBackend(id) {
  const { error } = await supabase
    .from("movies")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Failed to delete movie", error);
    return;
  }

  await loadMoviesFromSupabase();
  renderMovies();
}

// Rendering
function renderMovies() {
  unwatchedListEl.innerHTML = "";
  watchedListEl.innerHTML = "";

  let unwatchedCount = 0;
  let watchedCount = 0;

  if (movies.length === 0) {
    unwatchedListEl.innerHTML = '<div class="empty-state">No items yet. Add something above.</div>';
    watchedListEl.innerHTML = '<div class="empty-state">Nothing watched yet.</div>';
  } else {
    movies.forEach(movie => {
      const card = document.createElement("div");
      card.className = "movie-card";
      card.dataset.id = movie.id;

      const img = document.createElement("img");
      img.src = movie.poster || PLACEHOLDER;
      img.alt = movie.title;
      img.onerror = () => {
        img.src = PLACEHOLDER;
      };

      const infoDiv = document.createElement("div");
      infoDiv.className = "movie-info";

      const titleEl = document.createElement("div");
      titleEl.className = "movie-title";
      titleEl.textContent = movie.title || "(No title)";

      const metaEl = document.createElement("div");
      metaEl.className = "movie-meta";
      const parts = [];
      if (movie.year) parts.push(movie.year);
      if (movie.genre) parts.push(movie.genre);
      if (movie.type) parts.push(movie.type.charAt(0).toUpperCase() + movie.type.slice(1));
      metaEl.textContent = parts.join(" • ");

      const reviewEl = document.createElement("div");
      reviewEl.className = "movie-review";
      reviewEl.textContent = movie.review || "";

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "movie-actions";

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn-ghost watched";
      toggleBtn.dataset.action = "toggleWatched";
      toggleBtn.dataset.id = movie.id;
      toggleBtn.textContent = movie.watched ? "Move to To watch" : "Mark as watched";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-ghost delete";
      deleteBtn.dataset.action = "deleteMovie";
      deleteBtn.dataset.id = movie.id;
      deleteBtn.textContent = "Delete";

      actionsDiv.appendChild(toggleBtn);
      actionsDiv.appendChild(deleteBtn);

      infoDiv.appendChild(titleEl);
      infoDiv.appendChild(metaEl);
      if (movie.review) infoDiv.appendChild(reviewEl);
      infoDiv.appendChild(actionsDiv);

      card.appendChild(img);
      card.appendChild(infoDiv);

      if (movie.watched) {
        watchedListEl.appendChild(card);
        watchedCount++;
      } else {
        unwatchedListEl.appendChild(card);
        unwatchedCount++;
      }
    });

    if (unwatchedCount === 0) {
      unwatchedListEl.innerHTML = '<div class="empty-state">Everything is watched. Nice.</div>';
    }
    if (watchedCount === 0) {
      watchedListEl.innerHTML = '<div class="empty-state">Nothing in watched list yet.</div>';
    }
  }

  unwatchedCountEl.textContent = unwatchedCount + (unwatchedCount === 1 ? " item" : " items");
  watchedCountEl.textContent = watchedCount + (watchedCount === 1 ? " item" : " items");
}

// Clear form
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

// Handle list clicks
function handleListClick(event) {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  if (!action || !id) return;

  const movie = movies.find(m => String(m.id) === String(id));
  if (!movie) return;

  if (action === "toggleWatched") {
    const newWatched = !movie.watched;
    toggleWatchedInBackend(movie.id, newWatched);
  } else if (action === "deleteMovie") {
    if (confirm("Remove this item from your list?")) {
      deleteMovieInBackend(movie.id);
    }
  }
}

// Suggestions handling
function hideSuggestions() {
  suggestionsList.style.display = "none";
  suggestionsList.innerHTML = "";
}

function showSuggestions(results) {
  if (!results || results.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsList.innerHTML = "";
  results.forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.dataset.imdbid = item.imdbID;
    div.dataset.title = item.Title;
    div.dataset.year = item.Year || "";
    div.dataset.type = item.Type || "movie";

    div.innerHTML =
      '<span class="suggestion-title">' +
      item.Title +
      '</span><span class="suggestion-meta">' +
      (item.Year || "") +
      " · " +
      (item.Type ? item.Type.toUpperCase() : "") +
      "</span>";

    div.addEventListener("click", () => onSuggestionClick(item));
    suggestionsList.appendChild(div);
  });

  suggestionsList.style.display = "block";
}

async function fetchSuggestions(query) {
  try {
    const resp = await fetch(
      "https://www.omdbapi.com/?apikey=" +
        encodeURIComponent(OMDB_API_KEY) +
        "&s=" +
        encodeURIComponent(query.trim())
    );
    const data = await resp.json();
    if (data && data.Search) {
      showSuggestions(data.Search.slice(0, 8));
    } else {
      hideSuggestions();
    }
  } catch (err) {
    console.error("Error fetching suggestions", err);
    hideSuggestions();
  }
}

async function onSuggestionClick(item) {
  hideSuggestions();

  titleInput.value = item.Title || "";
  yearInput.value = item.Year || "";
  typeSelect.value = item.Type || "movie";

  if (item.Poster && item.Poster !== "N/A") {
    posterPreview.src = item.Poster;
  } else {
    posterPreview.src = PLACEHOLDER;
  }

  try {
    const resp = await fetch(
      "https://www.omdbapi.com/?apikey=" +
        encodeURIComponent(OMDB_API_KEY) +
        "&i=" +
        encodeURIComponent(item.imdbID) +
        "&plot=short"
    );
    const details = await resp.json();
    if (details && details.Response !== "False") {
      if (details.Genre && details.Genre !== "N/A") {
        genreInput.value = details.Genre;
      }
      if (details.Poster && details.Poster !== "N/A") {
        posterPreview.src = details.Poster;
      }
    }
  } catch (err) {
    console.error("Error fetching movie details", err);
  }
}

function onSearchInput() {
  const query = searchInput.value.trim();
  if (query.length < 3) {
    hideSuggestions();
    return;
  }

  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchSuggestions(query), 350);
}

// Event wiring
searchInput.addEventListener("input", onSearchInput);

document.addEventListener("click", event => {
  if (!event.target.closest(".suggestions")) {
    hideSuggestions();
  }
});

addMovieBtn.addEventListener("click", event => {
  event.preventDefault();
  addMovie();
});

unwatchedListEl.addEventListener("click", handleListClick);
watchedListEl.addEventListener("click", handleListClick);

// Start app
showAuth();
checkUser();
renderMovies();
