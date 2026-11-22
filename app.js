(() => {
  const screens = {
    open: document.getElementById("open"),
    film: document.getElementById("film"),
    card: document.getElementById("card"),
  };
  const video = document.getElementById("video");
  const song = document.getElementById("song");
  const musicBtn = document.getElementById("musicBtn");

  // stagger the reveal of each line on the card
  document.querySelectorAll("#card .reveal").forEach((el, i) => el.style.setProperty("--i", i));

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => el.classList.toggle("is-active", key === name));
  }

  function setMusic(on) {
    if (on) {
      song.play().catch(() => {});
    } else {
      song.pause();
    }
    musicBtn.classList.toggle("is-muted", !on);
    musicBtn.setAttribute("aria-label", on ? "إيقاف الموسيقى" : "تشغيل الموسيقى");
  }

  function playFilm() {
    show("film");
    video.currentTime = 0;
    const p = video.play();
    if (p) p.catch(() => showCard()); // if the video can't play, go straight to the card
  }

  function showCard() {
    video.pause();
    // restart the reveal animation every time the card is shown
    screens.card.classList.remove("is-active");
    void screens.card.offsetWidth;
    show("card");
  }

  document.getElementById("openBtn").addEventListener("click", () => {
    song.volume = 0.85;
    setMusic(true);           // started inside the tap, so phones allow it
    musicBtn.hidden = false;
    playFilm();
  });

  video.addEventListener("ended", showCard);
  video.addEventListener("error", showCard);
  document.getElementById("skipBtn").addEventListener("click", showCard);
  document.getElementById("replayBtn").addEventListener("click", playFilm);

  musicBtn.addEventListener("click", () => setMusic(song.paused));
})();
