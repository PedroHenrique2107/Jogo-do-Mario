const isMobile = window.innerWidth <= 768;
const MOBILE_SPEED_MULTIPLIER = 1.5;
const mario = document.querySelector(".mario");
const tubo = document.querySelector(".Tubo");
const restartButton = document.getElementById("restartButton");
const coinsContainer = document.querySelector(".coins");
const coinCountElement = document.querySelector(".coin-count");
const gameBoard = document.querySelector(".game-board");
const deathX = document.querySelector(".death-x");
const levelValue = document.querySelector(".level-value");
let coinCount = 0;
let isGameOver = false;
let isJumping = false;
let jumpCount = 0;
let lastJumpTime = 0;
const JUMP_COOLDOWN = 300; // Tempo mínimo entre pulos em milissegundos
let jumpTimeout = null;
let currentSpeedLevel = 0; // 0: Fácil, 1: Médio, 2: Difícil
let targetSpeed = 1.0;
let isAccelerating = false;
let isDecelerating = false;
let speedUpdateInterval;

// Configuração dos controles
const CONTROLS = {
    SPEED_UP: ['ArrowRight', 'KeyD'],
    SPEED_DOWN: ['ArrowLeft', 'KeyA'],
    JUMP: ['Space', 'ArrowUp', 'KeyW']
};

// Configurações de velocidade
const SPEED_CONFIG = {
    MIN_SPEED: 0.5,
    MAX_SPEED: 2.0,
    ACCELERATION: 0.05,
    DECELERATION: 0.03,
    UPDATE_INTERVAL: 16 // ~60fps
};

const audio = document.createElement('audio');
audio.setAttribute('src', 'C:\Users\User\Desktop\PROA\Visual Studio\Projeto Mario\sound/super-mario-song-supercut-original-theme_iKzkLXQB.mp3');
audio.setAttribute('autoplay', true);
audio.setAttribute('loop', true);

document.body.appendChild(audio);

// Função para mostrar o X de morte
function showDeathX(x, y) {
    deathX.style.left = `${x}px`;
    deathX.style.top = `${y}px`;
    deathX.style.display = 'flex';
    deathX.classList.add('show');
}

// Função para atualizar o indicador de nível
function updateSpeedLevel(level) {
    const levels = [SPEED_LEVELS.EASY, SPEED_LEVELS.MEDIUM, SPEED_LEVELS.HARD];
    const currentLevel = levels[level];
    
    levelValue.classList.remove('easy', 'medium', 'hard');
    levelValue.classList.add(currentLevel.class);
    levelValue.textContent = currentLevel.name;
    
    // Atualizar velocidade do Mario ajustando a duração da animação de corrida
    mario.style.animationDuration = `${currentLevel.speed}s`;
    // Atualizar velocidade do tubo
    tubo.style.animationDuration = `${currentLevel.tubeSpeed}s`;
}

// Função para atualização suave da velocidade
function updateSpeedSmooth() {
    if (isGameOver) return;

    if (isAccelerating) {
        targetSpeed = Math.min(SPEED_CONFIG.MAX_SPEED, targetSpeed + SPEED_CONFIG.ACCELERATION);
    } else if (isDecelerating) {
        targetSpeed = Math.max(SPEED_CONFIG.MIN_SPEED, targetSpeed - SPEED_CONFIG.ACCELERATION);
    } else {
        if (targetSpeed > 1.0) {
            targetSpeed = Math.max(1.0, targetSpeed - SPEED_CONFIG.DECELERATION);
        } else if (targetSpeed < 1.0) {
            targetSpeed = Math.min(1.0, targetSpeed + SPEED_CONFIG.DECELERATION);
        }
    }

    playerSpeed += (targetSpeed - playerSpeed) * 0.1;
    
    const currentTime = Date.now();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    const timeBonus = Math.floor(elapsedTime / 30) * 0.1;
    
    let finalSpeed = (1.0 + timeBonus) * playerSpeed;
    if (isMobile) {
        finalSpeed *= MOBILE_SPEED_MULTIPLIER;
    }
    
    gameSpeed = finalSpeed;
    
    tubo.style.animationDuration = `${2 / gameSpeed}s`;
    
    document.querySelectorAll('.coin').forEach(coin => {
        const animation = coin.getAnimations()[0];
        if (animation) {
            animation.playbackRate = gameSpeed;
        }
    });

    const marioAnimation = mario.getAnimations().find(a => a.animationName === 'run');
    if (marioAnimation) {
        marioAnimation.playbackRate = gameSpeed * (1 + currentSpeedLevel * 0.1);
    }
}

// Função para criar moedas
function createCoin() {
    if (isGameOver) return;
    
    const coin = document.createElement('img');
    coin.src = './img/MoedaSuperMarioBros.png';
    coin.className = 'coin';
    
    // Posiciona a moeda em uma altura aleatória entre 50px e 200px do chão
    const bottomPosition = Math.random() * 150 + 50;
    coin.style.bottom = `${bottomPosition}px`;
    
    // Posiciona a moeda fora da tela à direita
    coin.style.right = '-50px';
    
    coinsContainer.appendChild(coin);
    
    // Animação da moeda
    const animation = coin.animate([
        { right: '-50px' },
        { right: '100%' }
    ], {
        duration: 3000,
        easing: 'linear'
    });
    
    animation.onfinish = () => {
        if (!isGameOver) {
            coin.remove();
        }
    };
}

// Função para verificar colisão com moedas
function checkCoinCollision() {
    if (isGameOver) return;
    
    const marioRect = mario.getBoundingClientRect();
    const coins = document.querySelectorAll('.coin');
    
    coins.forEach(coin => {
        const coinRect = coin.getBoundingClientRect();
        
        if (marioRect.left < coinRect.right &&
            marioRect.right > coinRect.left &&
            marioRect.top < coinRect.bottom &&
            marioRect.bottom > coinRect.top) {
            coin.remove();
            coinCount++;
            coinCountElement.textContent = `x ${coinCount}`;
        }
    });
}

// Função para verificar colisão
function checkCollision() {
    const marioRect = mario.getBoundingClientRect();
    const tuboRect = tubo.getBoundingClientRect();

    // Ajuste fino na detecção de colisão
    const collisionMargin = {
        left: 30,    // Margem da esquerda
        right: 30,   // Margem da direita
        top: 20      // Margem do topo
    };

    // Verifica se o Mario está realmente próximo o suficiente do tubo
    const horizontalCollision = 
        marioRect.right - collisionMargin.right > tuboRect.left + collisionMargin.left &&
        marioRect.left + collisionMargin.left < tuboRect.right - collisionMargin.right;

    // Verifica se o Mario está na altura correta para colidir
    const verticalCollision = 
        marioRect.bottom > tuboRect.top + collisionMargin.top;

    // Só retorna true se houver colisão tanto horizontal quanto vertical
    return horizontalCollision && verticalCollision;
}

// Função de pulo melhorada
const pulo = () => {
    const currentTime = Date.now();
    
    // Verifica se já passou tempo suficiente desde o último pulo
    if (currentTime - lastJumpTime < JUMP_COOLDOWN) {
        return;
    }
    
    if (isGameOver) return;
    
    isJumping = true;
    mario.classList.add("pulo");
    jumpCount++;
    lastJumpTime = currentTime;

    // Remove a classe de pulo após a animação terminar
    setTimeout(() => {
        mario.classList.remove("pulo");
        isJumping = false;
    }, 800);
};

// Eventos de teclado
document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
        event.preventDefault(); // Previne o scroll da página
        pulo();
    }
});

// Eventos de toque para mobile
const jumpBtn = document.querySelector('.jump');
jumpBtn.addEventListener('touchstart', (event) => {
    event.preventDefault();
    pulo();
});

// Função de morte do Mario
function killMario() {
    if (isGameOver) return;
    
    isGameOver = true;
    
    // Posição do Mario para o X
    const marioRect = mario.getBoundingClientRect();
    showDeathX(marioRect.left + marioRect.width / 2, marioRect.top + marioRect.height / 2);
    
    // Animação de queda
    mario.classList.add('falling');
    mario.style.left = `${mario.offsetLeft}px`;
    
    // Parar todas as animações
    tubo.style.animation = "none";
    tubo.style.left = tubo.offsetLeft + 'px';
    
    // Parar moedas
    document.querySelectorAll('.coin').forEach(coin => {
        const animation = coin.getAnimations()[0];
        if (animation) animation.pause();
    });
    
    // Mostrar game over após a animação de queda
    setTimeout(() => {
        clearInterval(timerInterval);
        clearInterval(gameLoop);
        createGameOverReport(finalTime);
    }, 2000);
}

// Função para criar o relatório final
function createGameOverReport(finalTime) {
    const gameOverContainer = document.createElement('div');
    gameOverContainer.className = 'game-over-container';
    
    const gameOverText = document.createElement('h1');
    gameOverText.textContent = 'Game Over!';
    
    const timeText = document.createElement('p');
    timeText.textContent = `Tempo: ${finalTime}`;
    
    const coinsText = document.createElement('p');
    coinsText.textContent = `Moedas: ${coinCount}`;
    
    const restartBtn = document.createElement('button');
    restartBtn.className = 'restart-button';
    restartBtn.textContent = 'Jogar Novamente';
    restartBtn.onclick = () => location.reload();
    
    gameOverContainer.appendChild(gameOverText);
    gameOverContainer.appendChild(timeText);
    gameOverContainer.appendChild(coinsText);
    gameOverContainer.appendChild(restartBtn);
    
    gameBoard.appendChild(gameOverContainer);
}

// Criar moedas periodicamente
setInterval(createCoin, 2000);

// Verificar colisões com moedas
setInterval(checkCoinCollision, 100);

// Adicionar elemento para o temporizador
const timerElement = document.querySelector('.timer');

// Variáveis para o temporizador
let startTime = Date.now();
let timerInterval;
let finalTime = '00:00';

// Função para atualizar o temporizador
function updateTimer() {
    const currentTime = Date.now();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    finalTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerElement.textContent = finalTime;
}

// Iniciar o temporizador
timerInterval = setInterval(updateTimer, 1000);

// Loop principal do jogo
const gameLoop = setInterval(() => {
    if (isGameOver) return;
    
    if (checkCollision()) {
        killMario();
    }
}, 10);

// Eventos de toque para mobile
const speedUpBtn = document.querySelector('.speed-up');
const speedDownBtn = document.querySelector('.speed-down');
