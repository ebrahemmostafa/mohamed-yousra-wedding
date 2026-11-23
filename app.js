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
  const playBtn = document.getElementById("playBtn");

  // Flow:  tap → verse (silent, 5s) → film + song → fathers' invitation → details (stays)
  const VERSE_MS = 5000;
  const PAGE_HOLD_MS = { fathers: 14000 };   // pages that move on by themselves
  const SONG_VOLUME = 0.85;

  let userMuted = false;   // the guest turned the music off with the button
  let pageTimer = null;
  let flowTimer = null;
  let stallTimer = null;
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

  // Same for the film: some phones (iPhone Low Power Mode, some Android and
  // in-app browsers) refuse to start a video that wasn't started by a tap.
  function unlockVideo() {
    video.muted = true;
    const p = video.play();
    const reset = () => { video.pause(); video.currentTime = 0; };
    if (p) p.then(reset).catch(() => {});
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

  // If the phone still blocks the film, show a big play button instead of
  // skipping it: a tap on it is always allowed to start the video.
  function showPlayButton() {
    playBtn.hidden = false;
  }

  function startVideo() {
    playBtn.hidden = true;
    video.muted = true;
    const p = video.play();
    if (p) p.catch(showPlayButton);
    // watchdog: if nothing is moving after a few seconds, offer the button
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      if (screens.film.classList.contains("is-active") && video.currentTime < 0.2) showPlayButton();
    }, 3500);
  }

  function playFilm() {
    clearTimeout(flowTimer);
    clearTimeout(pageTimer);
    if (filmBroken) {             // couldn't load at all: keep the song, show the invitation
      song.currentTime = 0;
      showInvitation();
      return;
    }
    show("film");
    song.currentTime = 0;
    if (!userMuted) fadeSong(SONG_VOLUME, 600);
    video.currentTime = 0;
    startVideo();
  }

  function showInvitation() {
    clearTimeout(flowTimer);
    clearTimeout(stallTimer);
    playBtn.hidden = true;
    video.pause();
    show("card");
    goToPage(pageIndexOf("fathers"));
  }

  document.getElementById("openBtn").addEventListener("click", () => {
    song.volume = SONG_VOLUME;
    unlockSong();
    unlockVideo();
    musicBtn.hidden = false;
    syncMusicButton();
    showVerse();
  });

  video.addEventListener("ended", showInvitation);
  // file truly can't load on this phone: skip the film rather than get stuck
  let filmBroken = false;
  const onFilmError = () => {
    filmBroken = true;
    if (screens.film.classList.contains("is-active")) showInvitation();
  };
  video.addEventListener("error", onFilmError);
  video.querySelector("source").addEventListener("error", onFilmError);
  video.addEventListener("playing", () => { playBtn.hidden = true; });
  playBtn.addEventListener("click", () => {
    if (!userMuted) song.play().catch(() => {});      // this tap also re-allows the song
    startVideo();
  });
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
