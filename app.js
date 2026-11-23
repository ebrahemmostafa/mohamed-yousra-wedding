(() => {
  const screens = {
    open: document.getElementById("open"),
    film: document.getElementById("film"),
    card: document.getElementById("card"),
  };
  const pages = [...document.querySelectorAll("#card .page")];   // verse, fathers, details
  const dots = [...document.querySelectorAll("#card .dots i")];
  const nextBtn = document.getElementById("nextBtn");
  const video = document.getElementById("video");
  const song = document.getElementById("song");
  const musicBtn = document.getElementById("musicBtn");

  // how long each page stays before moving on by itself (the last page stays)
  const PAGE_HOLD_MS = { verse: 13000, fathers: 14000 };
  const SONG_VOLUME = 0.85;

  let userMuted = false;   // the guest turned the music off with the button
  let pageIndex = 0;
  let pageTimer = null;
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
    if (to > 0) {
      song.play().catch(() => {});
    }
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

  function syncMusicButton() {
    const on = !userMuted;
    musicBtn.classList.toggle("is-muted", !on);
    musicBtn.setAttribute("aria-label", on ? "إيقاف الموسيقى" : "تشغيل الموسيقى");
  }

  /* ---------- pages inside the card ---------- */

  function goToPage(i) {
    clearTimeout(pageTimer);
    pageIndex = i;
    const page = pages[i];

    pages.forEach((p, j) => {
      p.classList.toggle("is-current", j === i);
    });
    // restart the line-by-line reveal of the page we land on
    page.classList.remove("is-current");
    void page.offsetWidth;
    page.classList.add("is-current");

    dots.forEach((d, j) => d.classList.toggle("is-on", j === i));

    // music: silent for the verse, back on for everything after it
    if (page.dataset.page === "verse") {
      fadeSong(0, 800);
    } else if (!userMuted) {
      fadeSong(SONG_VOLUME, 1400);
    }

    const isLast = i === pages.length - 1;
    nextBtn.hidden = isLast;
    screens.card.classList.toggle("on-last-page", isLast);

    const hold = PAGE_HOLD_MS[page.dataset.page];
    if (hold && !isLast) {
      pageTimer = setTimeout(() => goToPage(i + 1), hold);
    }
  }

  /* ---------- flow ---------- */

  function playFilm() {
    clearTimeout(pageTimer);
    show("film");
    if (!userMuted) fadeSong(SONG_VOLUME, 300);
    video.currentTime = 0;
    const p = video.play();
    if (p) p.catch(() => showCard()); // if the video can't play, go straight to the card
  }

  function showCard() {
    video.pause();
    show("card");
    goToPage(0);
  }

  document.getElementById("openBtn").addEventListener("click", () => {
    song.volume = SONG_VOLUME;
    song.play().catch(() => {});   // started inside the tap, so phones allow it
    musicBtn.hidden = false;
    syncMusicButton();
    playFilm();
  });

  video.addEventListener("ended", showCard);
  video.addEventListener("error", showCard);
  document.getElementById("skipBtn").addEventListener("click", showCard);
  document.getElementById("replayBtn").addEventListener("click", playFilm);
  nextBtn.addEventListener("click", () => goToPage(Math.min(pageIndex + 1, pages.length - 1)));

  musicBtn.addEventListener("click", () => {
    userMuted = !userMuted;
    syncMusicButton();
    const onVerse = screens.card.classList.contains("is-active")
      && pages[pageIndex].dataset.page === "verse";
    if (userMuted) {
      fadeSong(0, 300);
    } else if (!onVerse) {
      fadeSong(SONG_VOLUME, 600);
    }
  });
})();
