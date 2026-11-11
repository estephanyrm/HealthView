(function () {
  const loader = document.getElementById("page-loader");
  const progressBar = loader?.querySelector(".page-loader__bar");
  const progressTrack = loader?.querySelector(".page-loader__track");
  const percentageLabel = loader?.querySelector(".page-loader__percentage");

  if (!loader || !progressBar || !progressTrack || !percentageLabel) {
    console.error("HealthView: page loader markup is incomplete.");
    document.body.classList.remove("is-loading");
    return;
  }

  const startedAt = performance.now();
  const minimumDisplayTime = 750;
  let progress = 0;
  let pageLoaded = document.readyState === "complete";
  let finishTimer;
  let finishing = false;
  let fallbackTimer;

  function setProgress(value) {
    progress = Math.min(100, Math.max(progress, value));
    progressBar.style.width = `${progress}%`;
    progressTrack.setAttribute("aria-valuenow", String(Math.round(progress)));
    percentageLabel.textContent = `${Math.round(progress)}%`;
  }

  function completeLoading() {
    if (!pageLoaded || finishing) {
      return;
    }

    finishing = true;
    const remainingTime = Math.max(
      0,
      minimumDisplayTime - (performance.now() - startedAt)
    );

    window.clearTimeout(finishTimer);
    finishTimer = window.setTimeout(() => {
      window.clearInterval(progressTimer);
      setProgress(100);
      window.setTimeout(() => {
        loader.classList.add("is-exiting");
        loader.setAttribute("aria-hidden", "true");
        window.setTimeout(() => {
          loader.remove();
          document.body.classList.remove("is-loading");
        }, 500);
      }, 180);
    }, remainingTime);
  }

  const progressTimer = window.setInterval(() => {
    if (pageLoaded) {
      const progressAfterLoad = Math.min(
        96,
        88 + ((performance.now() - startedAt) / minimumDisplayTime) * 8
      );
      setProgress(progressAfterLoad);
    } else if (progress < 88) {
      setProgress(progress + Math.max(1, (88 - progress) * 0.08));
    }
  }, 100);

  window.addEventListener(
    "load",
    () => {
      pageLoaded = true;
      window.clearTimeout(fallbackTimer);
      completeLoading();
    },
    { once: true }
  );

  if (pageLoaded) {
    completeLoading();
  } else {
    fallbackTimer = window.setTimeout(() => {
      pageLoaded = true;
      completeLoading();
    }, 12000);
  }
})();
