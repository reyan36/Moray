# 🎬 MORAY

**Your personal cinema archive, powered by AI.**

Moray is a minimal, professional movie tracking application built on the **"Live Forever"** architecture. It combines a distraction-free interface with **Google Firebase** for permanent storage and **Groq AI** for intelligent recommendations.

## 👩🏽‍🍳 Features

### AI 
- **Smart Pick:** Can't decide? Tell the AI how much time you have (e.g., *"90 mins, sci-fi"*), and it will analyze your specific list to recommend the perfect movie.
- **AI Auto-Fill:** Automatically generates 1-sentence reviews and ratings for any title so you don't have to type generic notes.

### Cinema Manager
- **Instant Search:** Fetches metadata and high-res posters via OMDb API.
- **Organization:** Seamlessly move titles between **"To Watch"** and **"History"**.
- **Minimal UI:** A professional "Zinc" dark theme designed for focus, not clutter.

### The Backend
- **Firebase Auth:** Secure Google & Email login that persists forever.
- **Cloud Firestore:** Real-time database that never "pauses" due to inactivity (unlike Supabase).
- **Vercel Serverless:** Securely handles API keys so they are never exposed to the client.



## 📦 Technologies Used

- **Frontend:** HTML5, CSS3 (Zinc Theme), Vanilla JavaScript (ES Modules)
- **Backend:** Google Firebase (Auth & Firestore)
- **AI Engine:** Groq (Llama 3 Model)
- **API Security:** Vercel Serverless Functions
- **Data Source:** OMDb API



## 📂 Project Structure

```text
/Moray
  ├── api/
  │    └── ai.js        # Secure Serverless Function for AI
  ├── index.html        # Main App Structure
  ├── script.js         # Frontend Logic (Firebase + UI)
  ├── style.css         # Professional Dark Theme
  └── README.md
```


## 🎞️ Video

Click to watch the video ▶️

[![Watch the video](https://img.youtube.com/vi/hS93BTOJNqU/maxresdefault.jpg)](https://www.youtube.com/watch?v=hS93BTOJNqU)


## Developer

- [@Reyan Arshad](https://www.linkedin.com/in/reyan36/)


## License

Distributed under the MIT License. See `LICENSE` for more information.

## © 2025 MORAY All rights reserved

