const greeting = document.querySelector("#greeting");
const likeButton = document.querySelector("#likeButton");
const likeCount = document.querySelector("#likeCount");
const sparkleLayer = document.querySelector(".sparkle-layer");

let likes = 0;

function setGreeting() {
  const hour = new Date().getHours();
  let message = "Hello!";

  if (hour < 12) {
    message = "Good morning!";
  } else if (hour < 18) {
    message = "Good afternoon!";
  } else {
    message = "Good evening!";
  }

  greeting.textContent = message;
}

function addSparkle(x, y) {
  const sparkle = document.createElement("span");
  sparkle.className = "click-sparkle";
  sparkle.style.left = `${x}px`;
  sparkle.style.top = `${y}px`;

  sparkleLayer.appendChild(sparkle);

  window.setTimeout(() => {
    sparkle.remove();
  }, 720);
}

likeButton.addEventListener("click", (event) => {
  likes += 1;
  likeCount.textContent = likes;
  addSparkle(event.clientX, event.clientY);
});

document.addEventListener("click", (event) => {
  if (event.target.closest("#likeButton")) {
    return;
  }

  addSparkle(event.clientX, event.clientY);
});

setGreeting();
