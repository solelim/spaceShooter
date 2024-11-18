import GameStateMachine from './GameStateMachine';
import * as PIXI from 'pixi.js';

let app = new PIXI.Application();

// #region TEXTURE AND CANVAS


let textures = await createCanvasAndLoadTextures(
    { width: 1280, height: 720 },
    ['asteroid', 'boss', 'player','space']
);

//не получилось загрузить space.jpg для заднего фона никаким методом почему то

//const spaceTexture = await PIXI.Assets.load(`images/space.jpg`)

// const spaceTexture = textures.space; // Загружаем текстуру космоса
// console.log(spaceTexture)
// const background = new PIXI.TilingSprite({
//     texture:spaceTexture, 
//     width:app.screen.width,
//     height: app.screen.height
// });

// app.stage.addChild(background); 

async function createCanvasAndLoadTextures(canvasSize, textureNames) {
    await app.init({
        width: canvasSize.width,
        height: canvasSize.height
    });

    document.body.appendChild(app.canvas);

    const textures = {};

    for (let name of textureNames) {
        try {
            let texture = null;
            // Сначала пробуем загрузить .png
            try {
                texture = await PIXI.Assets.load(`images/${name}.png`);
            } catch {
                console.warn(`не удалось загрузить ${name}.png, пробуем .jpg`);
                // Если .png не загрузился, пробуем .jpg
                texture = await PIXI.Assets.load(`images/${name}.jpg`);
            }

            if (!texture) {
                console.error(`не удалось загрузить текстуры для ${name}`);
            } else {
                textures[name] = texture;
            }
        } catch (error) {
            console.error(`Ошибка загрузки изображения ${name}:`, error);
        }
    }
    return { textures: textures, app: app };
}
// #endregion

// #region Variables
// Переменные игры
const PLAYER_SPEED = 7;
const BOSS_SPEED = 5;
const BULLET_SPEED = 20;
const ASTEROID_COUNT = 5;
const MAX_BULLETS = 10;
const LVL_TIME_LIMIT = 60;
const BOSS_HP = 4
const PLAYER_SIZE = {x:40,y:40}
const BOSS_SIZE = {x:60,y:60}
const SHOOT_BOSS_INTREVAL = 2000

let lvl1loop
let lvl2loop
let moveplayer
let updateplayerBullets
let updateasteroids
let updateboss
let attentionticker
let timeBossAttackInterval
let updateTimerInterval

//обьекты на сцене
let attentionText
let bossText
let timerText
let playerBulletsText
let player 
let boss
let playerBullets = [];
let bossBullets = [];
let asteroids = [];
let playerBulletsFired = 0;
let keyboard = {
    keys: {},
    isPressed(key) {
        return this.keys[key] === true;
    }
};

// Флаг для блокировки многократной стрельбы
let isShooting = false;
let gameState = new GameStateMachine();
// #endregion

// #region Setting up the game tree
gameState
    .addState('menu')
        .onEnter(() => {
            app.stage.removeChildren()
            createMenu()
            initPlayer() 
        })
        .onExit(() => {

        })
        .ready

    .addState('lvl1')
        .onEnter(() => {
            playerBullets.forEach((bullet) =>app.stage.removeChild(bullet))
            lvl1()

        })
        .onExit(() => {
            app.ticker.remove(lvl1loop);
            app.ticker.remove(updateasteroids);
            app.stage.removeChild(timerText);
            app.stage.removeChild(playerBulletsText);
            clearInterval(updateTimerInterval);
        })
        .ready

    .addState('lvl2')
        .onEnter(() => {
            createAttentionText()
            let a = setTimeout(() => {
                app.stage.removeChild(bossText)
                app.stage.removeChild(attentionText)
                app.ticker.remove(attentionticker)
                clearTimeout(a)
                lvl2()
            }, 4000)
        })
        .onExit(() => {
        })
        .ready

    .addState('lose')
        .onEnter(() => {
            lose()
        })
        .onExit(() => {
        })
        .ready

    .addState('win')
        .onEnter(() => {
            win()
        })
        .onExit(() => {
        })
        .ready

gameState.setState('menu')
// #endregion

//#region functions
function createMenu() {
    // Создаем текст с нужными стилями
    const startButton = new PIXI.Text({
        text: 'START GAME',
        style: {
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xFFFFFF,
            align: 'center',
        }
    })

    startButton.anchor.set(0.5, 0.5); // Центруем текст относительно его позиции

    // Позиционируем кнопку по центру
    startButton.x = app.canvas.width / 2;
    startButton.y = app.canvas.height / 2;

    // Настраиваем интерактивность контейнера
    startButton.interactive = true;
    startButton.buttonMode = true;

    // Устанавливаем обработчик события нажатия
    startButton.on('pointerdown', () => {
        app.stage.removeChild(startButton);
        gameState.setState('lvl1'); // Переход в игру с астероидами
    });

    app.stage.addChild(startButton);
}

function lvl1() {
    playerBulletsFired = 0;
    let timeLeft = LVL_TIME_LIMIT;
    playerBullets = [];
    asteroids = [];

    asteroids = [];

    // Функция для проверки, пересекаются ли два астероида
    function isOverlapping(newAsteroid) {
        for (let asteroid of asteroids) {
            const dx = newAsteroid.x - asteroid.x;
            const dy = newAsteroid.y - asteroid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < asteroid.width / 2 + newAsteroid.width / 2) {
                return true; 
            }
        }
        return false; 
    }
    
    // Создаем астероиды
    for (let i = 0; i < ASTEROID_COUNT; i++) {
        let asteroid;
        do {
            // Генерируем новый астероид
            asteroid = new PIXI.Sprite(textures.textures['asteroid']);
            asteroid.x = Math.random() * (app.canvas.width - PLAYER_SIZE.x) + PLAYER_SIZE.x / 2;
            asteroid.y = Math.random() * (app.canvas.height / 2) + PLAYER_SIZE.y / 2;
    
            // Уменьшаем астероид в 3 раза
            asteroid.scale.set(0.33);
            asteroid.anchor.set(0.5, 0.5);
    
        } while (isOverlapping(asteroid)); // Если новый астероид перекрывает старый, генерируем новый
    
        app.stage.addChild(asteroid);
        asteroids.push(asteroid);
    }

    //timerText
    timerText = new PIXI.Text('Time Left:' + timeLeft +'s', { font: '24px Arial', fill: 0xFFFFFF });
    timerText.x = 10;
    timerText.y = 10;
    app.stage.addChild(timerText);

    //playerBulletsText
    playerBulletsText = new PIXI.Text('Bullets: 0/10', { font: '24px Arial', fill: 0xFFFFFF });
    playerBulletsText.x = app.canvas.width - 150; // Размещаем текст справа
    playerBulletsText.y = 10;
    app.stage.addChild(playerBulletsText);

    lvl1loop = lvl1Loop
    updateasteroids = updateAsteroids

    // Таймер 
    updateTimerInterval = setInterval(updateTimer, 1000);

    function lvl1Loop(par) {
        if (playerBulletsFired >= MAX_BULLETS && asteroids.length > 0 && gameState.currentState.name == 'lvl1') {
            gameState.setState('lose'); // Если пули исчерпаны, а астероиды остались, переход к проигрышу
        }
    }

    function updateAsteroids(par) {
        asteroids.forEach((asteroid, index) => {
            if (checkCollision(asteroid, player)) {
                app.stage.removeChild(asteroid);
                asteroids.splice(index, 1);
            }
    
            playerBullets.forEach((bullet, bulletIndex) => {
                if (checkCollision(asteroid, bullet)) {
                    app.stage.removeChild(asteroid);
                    app.stage.removeChild(bullet);
                    // Увеличиваем счетчик пуль
                    playerBulletsFired++;
    
                    // Обновляем текст с количеством пуль
                    if (playerBulletsText) {
                        playerBulletsText.text = `Bullets: ${playerBulletsFired}/${MAX_BULLETS}`;
                    }
                    asteroids.splice(index, 1);
                    playerBullets.splice(bulletIndex, 1);
                }
            });
        });
    
        if (asteroids.length === 0) {
            gameState.setState('lvl2'); // Переход к боссу
        }
    }

    app.ticker.add(lvl1loop);
    app.ticker.add(updateasteroids);

    function updateTimer() {
        if (gameState.currentState.name == 'lvl1') {
            if (timeLeft > 0) {
                timeLeft -= 1;
            } else {
                gameState.setState('lose'); // Переход в состояние "YOU LOSE"
            }
        }
        timerText.text = `Time Left: ${timeLeft}s`;
    }
}

function lvl2() {
    playerBulletsFired = 0;
    let timeLeft = LVL_TIME_LIMIT;
    //timerText
    timerText = new PIXI.Text('Time Left:' + timeLeft +'s', { font: '24px Arial', fill: 0xFFFFFF });
    timerText.x = 10;
    timerText.y = 10;
    app.stage.addChild(timerText);

    //playerBulletsText
    playerBulletsText = new PIXI.Text('Bullets: 0/10', { font: '24px Arial', fill: 0xFFFFFF });
    playerBulletsText.x = app.canvas.width - 150; // Размещаем текст справа
    playerBulletsText.y = 10;
    app.stage.addChild(playerBulletsText);

    // Таймер 
    updateTimerInterval = setInterval(updateTimer, 1000);

    //boss 
    boss = new PIXI.Sprite(textures.textures['boss']);
    boss.x = app.canvas.width / 2;
    boss.y = 100;

    boss.hp = BOSS_HP

    // Устанавливаем якорь в центр
    boss.anchor.set(0.5, 0.5);

    // Переворачиваем корабль и уменьшаем его размер в 3 раза
    boss.scale.set(0.33);
    boss.rotation = Math.PI;
    app.stage.addChild(boss);

    // Полоска здоровья босса
    let bossHealthBar = new PIXI.Graphics();
    const bossHealthBarWidth = 100; // Ширина полоски здоровья
    const bossHealthBarHeight = 10; // Высота полоски здоровья

    bossHealthBar.beginFill(0x00FF00);
    bossHealthBar.drawRect(0, 0, bossHealthBarWidth, bossHealthBarHeight);
    bossHealthBar.endFill();

    bossHealthBar.x = boss.x - bossHealthBarWidth / 2;
    bossHealthBar.y = boss.y - BOSS_SIZE.y / 2 - bossHealthBarHeight - 20;

    app.stage.addChild(bossHealthBar);
    updateboss = updateBoss

    timeBossAttackInterval = setInterval(() => {
        shootBossBullet()}, SHOOT_BOSS_INTREVAL);
    app.ticker.add(updateboss);

    lvl2loop = lvl2Loop
    app.ticker.add(lvl2loop);
    // Дополнительные переменные для контроля логики движения босса
    let bossIsMoving = false; // Изначально босс стоит на месте
    let bossDirection = 1; // 1 - в право, -1 - влево
    let moveCooldown = 0; // Счетчик времени до смены состояния

    // Функция для случайного выбора времени в интервале от 2 до 6 секунд (2000 - 6000 мс)
    function getRandomCooldown() {
        return Math.floor(Math.random() * (600/2 - 200/2 + 1)) + 200/2; 
    }


    function updateBoss(par) {
        let deltaTime = par.deltaTime
        let bulletSpeed = BULLET_SPEED*deltaTime;
        let bossSpeed = BOSS_SPEED*deltaTime;

        moveCooldown -= deltaTime; // Обновляем время с учетом времени кадра

        if (moveCooldown <= 0) {
            // Переключаем состояние (движется/стоит) и устанавливаем новый таймер
            bossIsMoving = !bossIsMoving; // Переключаем состояние
            moveCooldown = getRandomCooldown(); // Случайное время до следующей смены состояния
        }

        if (bossIsMoving) {
            // Если босс двигается, проверяем его текущую позицию
            if (boss.x - BOSS_SIZE.x <= 0 || boss.x + BOSS_SIZE.x>= app.screen.width) {
                bossDirection *= -1; // Изменить направление, если босс уперся в край экрана
            }
            boss.x += bossSpeed * bossDirection; // Двигаем босса
        } else {
            // Если босс стоит на месте, ничего не делаем
        }

        // Перемещение полоски здоровья вместе с боссом
        bossHealthBar.x = boss.x - bossHealthBarWidth / 2;
        bossHealthBar.y = boss.y - BOSS_SIZE.y / 2 - bossHealthBarHeight - 5;
    
        // Обновление пуль босса
        bossBullets.forEach((bossBullet, index) => {
            bossBullet.y += bulletSpeed; // Пуля движется вниз
    
            if (bossBullet.y > app.canvas.height) { // Удаляем пулю, если она вышла за экран
                app.stage.removeChild(bossBullet);
                bossBullets.splice(index, 1);
            }
    
            // Проверка столкновения с пулями игрока
            playerBullets.forEach((playerBullet, bulletIndex) => {
                if (checkCollision(bossBullet, playerBullet)) {
                    // Уничтожаем пули
                    app.stage.removeChild(bossBullet);
                    app.stage.removeChild(playerBullet);
                    bossBullets.splice(index, 1);
                    playerBullets.splice(bulletIndex, 1);
                }
            })
    
            // Проверка попадания пули босса в игрока
            if (checkCollision(bossBullet, player) && gameState.currentState.name === 'lvl2') {
                gameState.setState('lose'); // Переход в состояние "проигрыш"
            }
        })
    
        // Проверка попадания пуль игрока в босса
        playerBullets.forEach((playerBullet, bulletIndex) => {
            if (checkCollision(boss, playerBullet)) {
                boss.hp--; // Уменьшаем здоровье босса
    
                // Обновляем полоску здоровья
                bossHealthBar.width = (boss.hp / BOSS_HP) * bossHealthBarWidth;
    
                // Удаляем пулю игрока
                app.stage.removeChild(playerBullet);
                playerBullets.splice(bulletIndex, 1);
    
                // Проверка, умер ли босс
                if (boss.hp <= 0) {
                    app.stage.removeChild(boss); // Удаляем босса
                    app.stage.removeChild(bossHealthBar); // Удаляем полоску здоровья
                    gameState.setState('win'); // Переход в состояние победы
                }
            }
        })
    }
    
    function shootBossBullet() {
        let bullet = new PIXI.Graphics();
        bullet.beginFill(0xFF0000); // Красная пуля
        bullet.drawRect(0, 0, 5, 20); // Размер пули
        bullet.endFill();
    
        bullet.x = boss.x // Выстрел из центра босса
        bullet.y = boss.y+BOSS_SIZE.y/2; // Пуля появляется прямо под боссом
        app.stage.addChild(bullet);
        bossBullets.push(bullet);
    }

    function updateTimer() {
        if (gameState.currentState.name == 'lvl2') {
            if (timeLeft > 0) {
                timeLeft -= 1;
            } else {
                gameState.setState('lose'); // Переход в состояние "YOU LOSE"
            }
        }
        timerText.text = `Time Left: ${timeLeft}s`;
    }

    function lvl2Loop(par) {
        if (playerBulletsFired >= MAX_BULLETS && gameState.currentState.name == 'lvl2') {
            gameState.setState('lose'); // Если пули исчерпаны, а астероиды остались, переход к проигрышу
        }
    }
}

function initPlayer() {
    //player 
    player = new PIXI.Sprite(textures.textures['player']);
    player.x = app.canvas.width / 2;
    player.y = app.canvas.height - PLAYER_SIZE.y*2;

    // Устанавливаем якорь в центр
    player.anchor.set(0.5, 0.5);

    // Переворачиваем корабль и уменьшаем его размер в 3 раза
    player.scale.set(0.33); 
    player.rotation = Math.PI; 

    app.stage.addChild(player);

    moveplayer = movePlayer
    updateplayerBullets = updatePlayerBullets

    app.ticker.add(moveplayer);
    app.ticker.add(updateplayerBullets);

    function movePlayer(par) {
        let deltaTime = par.deltaTime
        let playerSpeed = PLAYER_SPEED*deltaTime;
        if (keyboard.isPressed("ArrowRight") && player.x + PLAYER_SIZE.x < app.canvas.width) {
            player.x += playerSpeed;
        } else if (keyboard.isPressed("ArrowLeft") && player.x - PLAYER_SIZE.x > 0) {
            player.x -= playerSpeed;
        }
    
        // Стрельба
        if (keyboard.isPressed(" ") && playerBullets.length < MAX_BULLETS && !isShooting) {
            createBullet();
            isShooting = true; // Заблокировать возможность выстрела
        }
    
        if (!keyboard.isPressed(" ")) {
            isShooting = false; // Разблокировать возможность выстрела при отпускании пробела
        }

        function createBullet() {
            let bullet = new PIXI.Graphics();
            bullet.beginFill(0xFFFFFF);
            bullet.drawRect(0, 0, 5, 10); // Размер пули
            bullet.endFill();
        
            // Позиция пули теперь будет в центре корабля
            bullet.x = player.x;
            bullet.y = player.y - player.height / 2 - bullet.height / 2; // Пуля появляется чуть выше корабля
            app.stage.addChild(bullet);
            playerBullets.push(bullet);
        }
    }

    function updatePlayerBullets(par) {
        let deltaTime = par.deltaTime
        let bulletSpeed = BULLET_SPEED*deltaTime;
        playerBullets.forEach((bullet, index) => {
            bullet.y -= bulletSpeed;
            if (bullet.y < 0) {
                app.stage.removeChild(bullet);
                // Увеличиваем счетчик пуль
                playerBulletsFired++;
    
                // Обновляем текст с количеством пуль
                if (playerBulletsText) {
                    playerBulletsText.text = `Bullets: ${playerBulletsFired}/${MAX_BULLETS}`;
                }
                playerBullets.splice(index, 1);
            }
        });
    }
}

function lose() {
    app.ticker.remove(lvl1loop)
    app.ticker.remove(lvl2loop)
    app.ticker.remove(moveplayer)
    app.ticker.remove(updateplayerBullets)
    app.ticker.remove(updateasteroids)
    app.ticker.remove(updateboss)

    clearInterval(timeBossAttackInterval);
    clearInterval(updateTimerInterval);
    
    // Создаем текст с надписью "YOU LOSE"
    const loseText = new PIXI.Text({
        text:'YOU LOSE', 
        style :{
            fontFamily: 'Arial',
            fontSize: 72,
            fill: 0xFF0000,
            align: 'center',
            fontWeight: 'bold',
        }
    });
    // Центрируем текст по экрану
    loseText.anchor.set(0.5, 0.5);
    loseText.x = app.screen.width / 2;
    loseText.y = app.screen.height / 2 - 100;

    app.stage.addChild(loseText);

    // Создаем текст-кнопку "GO TO MENU"
    const menuButton = new PIXI.Text({
        text:'GO TO MENU', 
        style :{
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xFFFFFF,
            align: 'center',
        }
    });

    // Центрируем кнопку
    menuButton.anchor.set(0.5, 0.5);
    menuButton.x = app.screen.width / 2;
    menuButton.y = app.screen.height / 2 + 50;

    // Настраиваем интерактивность
    menuButton.interactive = true;
    menuButton.buttonMode = true;

    // Устанавливаем обработчик события нажатия
    menuButton.on('pointerdown', () => {
        app.stage.removeChildren(); // Убираем все элементы со сцены
        gameState.setState('menu'); // Переход в состояние меню
    });

    app.stage.addChild(menuButton); 
}

function win() {
    app.ticker.remove(lvl1loop)
    app.ticker.remove(lvl2loop)
    app.ticker.remove(moveplayer)
    app.ticker.remove(updateplayerBullets)
    app.ticker.remove(updateasteroids)
    app.ticker.remove(updateboss)
    app.ticker.remove(attentionticker)
    
    clearInterval(timeBossAttackInterval);
    clearInterval(updateTimerInterval);
     
    // Создаем текст с надписью "YOU WIN"
    const loseText = new PIXI.Text({
        text:'YOU WIN', 
        style :{
            fontFamily: 'Arial',
            fontSize: 72,
            fill: 0x00FF00,
            align: 'center',
            fontWeight: 'bold',
        }
    });

    // Центрируем текст по экрану
    loseText.anchor.set(0.5, 0.5);
    loseText.x = app.screen.width / 2;
    loseText.y = app.screen.height / 2 - 100;

    app.stage.addChild(loseText);
    
    // Создаем текст-кнопку "GO TO MENU"
    const menuButton = new PIXI.Text({
        text:'GO TO MENU', 
        style :{
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xFFFFFF,
            align: 'center',
        }
    });

    // Центрируем кнопку
    menuButton.anchor.set(0.5, 0.5);
    menuButton.x = app.screen.width / 2;
    menuButton.y = app.screen.height / 2 + 50;

    // Настраиваем интерактивность
    menuButton.interactive = true;
    menuButton.buttonMode = true;

    // Устанавливаем обработчик события нажатия
    menuButton.on('pointerdown', () => {
        app.stage.removeChildren(); // Убираем все элементы со сцены
        gameState.setState('menu'); // Переход в состояние меню
    });

    app.stage.addChild(menuButton);  
}

function checkCollision(object1, object2) {
    // Корректируем координаты объектов с якорем (0.5, 0.5)
    const obj1Left = object1.x - object1.width /2
    const obj1Top = object1.y - object1.height /2
    const obj1Right = obj1Left + object1.width;
    const obj1Bottom = obj1Top + object1.height;

    const obj2Left = object2.x - object2.width /2
    const obj2Top = object2.y - object2.height /2
    const obj2Right = obj2Left + object2.width;
    const obj2Bottom = obj2Top + object2.height;

    // Проверка столкновения
    return obj1Right > obj2Left &&
           obj1Left < obj2Right &&
           obj1Bottom > obj2Top &&
           obj1Top < obj2Bottom;
}

function createAttentionText() {
    // Создание первого текста - "ATTENTION"

    attentionText = new PIXI.Text({
        text:'ATTENTION', 
        style :{
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xff0000,
            align: 'center',
        }
    });

    // Центрирование первого текста
    attentionText.x = app.screen.width / 2;
    attentionText.y = app.screen.height / 2 - attentionText.height / 2 - 30; // Немного выше, чтобы второй текст был ниже
    attentionText.scale.x = 1
    attentionText.scale.y = 1
    attentionText.anchor.set(0.5,0.5)

    // Создание второго текста - "THE BOSS COMING"
    bossText = new PIXI.Text({
        text:'THE BOSS COMING', 
        style :{
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xff0000,
            align: 'center',
        }
    });

    // Центрирование второго текста
    bossText.x = app.screen.width / 2;
    bossText.y = attentionText.y + attentionText.height + 10;  // Расстояние между текстами
    bossText.anchor.set(0.5,0.5)
    bossText.scale.x = 1
    bossText.scale.y = 1

    // Добавление обоих текстов на сцену
    app.stage.addChild(attentionText);
    app.stage.addChild(bossText);

    // Анимация пульсации для обоих текстов
    let scaleDirection = 1; // Направление анимации
    let SCALESPEED = 0.01;  // Скорость изменения масштаба
    let scaleSpeed = 0

    attentionticker = attentionTicker

    function attentionTicker(par) {
        scaleSpeed = SCALESPEED*par.deltaTime
        // Увеличение и уменьшение масштаба первого текста
        attentionText.scale.x += scaleSpeed * scaleDirection;
        attentionText.scale.y += scaleSpeed * scaleDirection;

        // Увеличение и уменьшение масштаба второго текста
        bossText.scale.x += scaleSpeed * scaleDirection;
        bossText.scale.y += scaleSpeed * scaleDirection;

        // Если текст слишком большой или маленький, меняем направление
        if (attentionText.scale.x > 1.5 || attentionText.scale.x < 1) {
            scaleDirection *= -1;  // Меняем направление анимации
        }
    }

    app.ticker.add(attentionticker);

}
// #endregion

// Обработчики событий клавиш
window.addEventListener('keydown', (event) => {
    keyboard.keys[event.key] = true;
});

window.addEventListener('keyup', (event) => {
    keyboard.keys[event.key] = false;
});