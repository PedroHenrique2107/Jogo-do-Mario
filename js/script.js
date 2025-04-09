const mario = document.querySelector(".mario");
const tubo = document.querySelector(".Tubo");
const restartButton = document.getElementById("restartButton");
const audio = document.createElement('audio');
audio.setAttribute('src', 'C:\Users\User\Desktop\PROA\Visual Studio\Projeto Mario\sound/super-mario-song-supercut-original-theme_iKzkLXQB.mp3');
audio.setAttribute('autoplay', true);
audio.setAttribute('loop', true);

document.body.appendChild(audio);

const pulo = () => {
  mario.classList.add("pulo");

  setTimeout(() => {
    mario.classList.remove("pulo");
  }, 500);
};

const loop = setInterval(() => {
  const tuboPosition = tubo.offsetLeft;
  const marioPosition = window.getComputedStyle(mario).bottom.replace('px',  '');

  if (tuboPosition <= 80 && tuboPosition > 0 && marioPosition <= 80) {

    tubo.style.animation = "none";
    tubo.style.left = `${tuboPosition}px`;

    mario.style.animation = "none";
    mario.style.bottom = `${marioPosition}px`;

    mario.src = './img/Gameover.png';
    mario.style.width = '75px';
    mario.style.marginLeft = '50px';

    restartButton.style.display = 'block';

    clearInterval(loop);

  }
}, 10);

// Evento de tecla para desktop
document.addEventListener("keydown", pulo);

// Evento de toque para dispositivos móveis
document.addEventListener("touchstart", (event) => {
  event.preventDefault(); // Previne o comportamento padrão do toque
  pulo();
});

restartButton.addEventListener('click', () => {
    location.reload();
});
