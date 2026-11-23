(() => {
  const screens = {
    open: document.getElementById("open"),
    film: document.getElementById("film"),
    card: document.getElementById("card"),
  };
  const pages = [...document.querySelectorAll("#card .page")];   // verse, fathers, details
  const pageIndexOf = (name) => pages.findIndex((p) => p.dataset.page === name);
  const video = document.getElementById("video");
  const song = document.getElementById("song");
  const musicBtn = document.getElementById("musicBtn");

  // Flow:  tap → verse (silent, 5s) → film + song → fathers' invitation → details (stays)
  const VERSE_MS = 5000;
  const PAGE_HOLD_MS = { fathers: 14000 };   // pages that move on by themselves
  const SONG_VOLUME = 0.85;

  let userMuted = false;   // the guest turned the music off with the button
  let pageTimer = null;
  let flowTimer = null;
  let fadeRaf = null;

  // stagger the reveal of the lines inside each page
  pages.forEach((page) => {
    page.querySelectorAll(".reveal").forEach((el, i) => el.style.setProperty("--i", i));
  });

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => el.classList.toggle("is-active", key === name));
  }

  /* ---------- music ---------- */

  // Fades the song in or out. iPhones ignore volume changes, so there the
  // song simply pauses / plays at the end of the fade.
  function fadeSong(to, ms = 900) {
    cancelAnimationFrame(fadeRaf);
    if (to > 0) song.play().catch(() => {});
    const from = song.volume;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / ms);
      try { song.volume = from + (to - from) * t; } catch (_) {}
      if (t < 1) {
        fadeRaf = requestAnimationFrame(step);
      } else if (to === 0) {
        song.pause();
      }
    };
    fadeRaf = requestAnimationFrame(step);
  }

  // Phones only allow audio that was started inside a tap. Play the song
  // silently for a moment during the opening tap so it can start later
  // (after the verse) without another tap.
  function unlockSong() {
    song.muted = true;
    const p = song.play();
    const reset = () => {
      song.pause();
      song.currentTime = 0;
      song.muted = false;
    };
    if (p) p.then(reset).catch(() => { song.muted = false; });
    else reset();
  }

  function syncMusicButton() {
    musicBtn.classList.toggle("is-muted", userMuted);
    musicBtn.setAttribute("aria-label", userMuted ? "تشغيل الموسيقى" : "إيقاف الموسيقى");
  }

  /* ---------- pages inside the card ---------- */

  function goToPage(i) {
    clearTimeout(pageTimer);
    const page = pages[i];

    // restart the line-by-line reveal of the page we land on
    pages.forEach((p) => p.classList.remove("is-current"));
    void page.offsetWidth;
    page.classList.add("is-current");

    // music: silent for the verse, on for everything after the film
    if (page.dataset.page === "verse") {
      fadeSong(0, 400);
    } else if (!userMuted) {
      fadeSong(SONG_VOLUME, 1200);
    }

    const hold = PAGE_HOLD_MS[page.dataset.page];
    if (hold && i < pages.length - 1) {
      pageTimer = setTimeout(() => goToPage(i + 1), hold);
    }
  }

  /* ---------- flow ---------- */

  function showVerse() {
    clearTimeout(flowTimer);
    clearTimeout(pageTimer);
    video.pause();
    show("card");
    goToPage(pageIndexOf("verse"));
    flowTimer = setTimeout(playFilm, VERSE_MS);
  }

  function playFilm() {
    clearTimeout(flowTimer);
    clearTimeout(pageTimer);
    show("film");
    song.currentTime = 0;
    if (!userMuted) fadeSong(SONG_VOLUME, 600);
    video.currentTime = 0;
    const p = video.play();
    if (p) p.catch(() => showInvitation()); // if the video can't play, go straight on
  }

  function showInvitation() {
    clearTimeout(flowTimer);
    video.pause();
    show("card");
    goToPage(pageIndexOf("fathers"));
  }

  document.getElementById("openBtn").addEventListener("click", () => {
    song.volume = SONG_VOLUME;
    unlockSong();
    musicBtn.hidden = false;
    syncMusicButton();
    showVerse();
  });

  video.addEventListener("ended", showInvitation);
  video.addEventListener("error", showInvitation);
  document.getElementById("skipBtn").addEventListener("click", showInvitation);
  document.getElementById("replayBtn").addEventListener("click", showVerse);

  musicBtn.addEventListener("click", () => {
    userMuted = !userMuted;
    syncMusicButton();
    const onVerse = screens.card.classList.contains("is-active")
      && pages.find((p) => p.classList.contains("is-current"))?.dataset.page === "verse";
    if (userMuted) {
      fadeSong(0, 300);
    } else if (!onVerse) {
      fadeSong(SONG_VOLUME, 600);
    }
  });
})();
