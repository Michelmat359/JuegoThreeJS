
var UNITWIDTH = 80;                 // Anchura de las paredes
var UNITHEIGHT = 200;                // Altura de las paredes
var CATCHOFFSET = 80;              // Distancia del mounstro para GAME OVER
var DINOCOLLISIONDISTANCE = 55;     // distancia del mounstro a la pared
var PLAYERCOLLISIONDISTANCE = 20;   // distancia del jugador a la pared
var PLAYERSPEED = 800.0;            // VELOCIDAD DEL JUGARO
var DINOSPEED = 400.0;              // VELOCIDAD DEL MOUNSTRO
var DINOSCALE = 100;                 // TAMAÑO DEL MOUNSTRO


var clock;
var dino;
var loader = new THREE.JSONLoader();
var objectLoader = new THREE.ObjectLoader();
var camera, controls, scene, renderer;
var mapSize;
var collidableObjects = [];
var totalCubesWide;


// Flags to determine which direction the player is moving
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

// Flag to determine if the player lost the game
var gameOver = false;

// Velocity vectors for the player and dino
var playerVelocity = new THREE.Vector3();
var dinoVelocity = new THREE.Vector3();


// HTML elements to be changed
var blocker = document.getElementById('blocker');
var instructions = document.getElementById('instructions');
var dinoAlert = document.getElementById('dino-alert');
dinoAlert.style.display = 'none';

var container = document.getElementById('container');
var body = document.getElementById('body');
var blocker = document.getElementById('blocker');


// Bloquea el puntero. 
function getPointerLock() {
    document.onclick = function () {
        container.requestPointerLock();
    }

    document.addEventListener('pointerlockchange', lockChange, false);
}

// Función para habilitar y deshabiltar el teclado.
function lockChange() {
    // Activa los controles
    if (document.pointerLockElement === container) {
        blocker.style.display = "none";
        controls.enabled = true;
    // Para los controles
    } else {
        if (gameOver) {
            location.reload();
        }
        // Muestra las instrucciones
        blocker.style.display = "";
        controls.enabled = false;
    }
}


// Preparando funciones para jugar
getPointerLock();
init();



// Constructor del Juego
function init() {

    // Set clock to keep track of frames
    clock = new THREE.Clock();
    // Create the scene where everything will go
    scene = new THREE.Scene();

    // Add some fog for effects
    scene.fog = new THREE.FogExp2(0x000000, 0.0015);

    // Set render settings
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(scene.fog.color);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Render to the container
    var container = document.getElementById('container');
    container.appendChild(renderer.domElement);

    // Set camera position and view details
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.y = 20; // Height the camera will be looking from
    camera.position.x = 0;
    camera.position.z = 0;

    // Add the camera to the controller, then add to the scene
    controls = new THREE.PointerLockControls(camera);
    scene.add(controls.getObject());

    listenForPlayerMovement();


    // Add the walls(cubes) of the maze
    createMazeCubes();
    // Add ground plane
    createGround();
    // Add perimeter walls that surround the maze
    createPerimWalls();


    //CARGAMOS EL MODELO DEL MOUNSTRO
    objectLoader.load("./models/virus.json", function ( dinoObject ) {
        
        // Usamos variables de entorno para definir caracteristicas del mounstro
        dinoObject.scale.set(DINOSCALE, DINOSCALE, -DINOSCALE);
        dinoObject.rotation.y = degreesToRadians(90);
        dinoObject.position.set(30, 0, -400);
        dinoObject.name = "dino";
        scene.add(dinoObject);
        dino = scene.getObjectByName("dino");
        // Instrucciones
        instructions.innerHTML = "<strong>¡¡ El COVID19 está a la vuelta de la esquina!! <br><br>¡¡ HUYE !!</strong><br><br><strong>Haz Click para Jugar!</strong> </br> <br><br></br> W,A,S,D para moverse </br></br> Usa el ratón para mover la camara. ";
        // Llama a la funcion animada para que la animacion comience despues de cargar el modelo
        animate();
    });

    // Añade luces a la escena
    addLights();

    // Para cambios de tamaño de las ventanas. 
    window.addEventListener('resize', onWindowResize, false);

}


// Funcion para que podamos movernos con el teclado
function listenForPlayerMovement() {
    // EScucha si pulsa tecla
    // Dependiendo de la tecla, realizacá una acción. 
    var onKeyDown = function (event) {

        switch (event.keyCode) {
            case 38: // Adelante
            case 87: // w
                moveForward = true;
                break;
            case 37: // Izquierda
            case 65: // a
                moveLeft = true;
                break;
            case 40: // Atrás
            case 83: // s
                moveBackward = true;
                break;
            case 39: // derecha
            case 68: // d
                moveRight = true;
                break;
        }
    };
    // Ahora la función de si deja de pulsar una tecla, poniendo a FALSE el moveForward
    var onKeyUp = function (event) {
        switch (event.keyCode) {
            case 38: 
            case 87: 
                moveForward = false;
                break;
            case 37: 
            case 65: 
                moveLeft = false;
                break;
            case 40: 
            case 83: 
                moveBackward = false;
                break;
            case 39: 
            case 68: 
                moveRight = false;
                break;
        }
    };
    // Añadimos estos eventos al juego de cuando se pulsa o deja de pulsar una tecla. 
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
}

// Oscuridad en el mapa.
function addLights() {
    var lightOne = new THREE.DirectionalLight(0xffffff);
    lightOne.position.set(1, 1, 1);
    scene.add(lightOne);

    var lightTwo = new THREE.DirectionalLight(0xffffff, .4);
    lightTwo.position.set(1, -1, -1);
    scene.add(lightTwo);
}

// Create the maze walls using cubes that are mapped with a 2D array
function createMazeCubes() {
    // 1 es pared 0 es espacio
    var map = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,],
        [1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1,],
        [1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1,],
        [1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1,],
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1,],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1,],
        [1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1,],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1,],
        [1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1,],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1,],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1,],
        [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1,],
        [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1,],
        [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1,],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,],
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1,],
        [1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1,],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,]
    ];

    // PAredes
    var cubeGeo = new THREE.BoxGeometry(UNITWIDTH, UNITHEIGHT, UNITWIDTH);
    var cubeMat = new THREE.MeshPhongMaterial({
        map: THREE.ImageUtils.loadTexture('images/ladrillos.jpg'),
    });
    var widthOffset = UNITWIDTH / 2;
    var heightOffset = UNITHEIGHT / 2;
    totalCubesWide = map[0].length;

    // Place walls where 1`s are
    for (var i = 0; i < totalCubesWide; i++) {
        for (var j = 0; j < map[i].length; j++) {
            // If a 1 is found, add a cube at the corresponding position
            if (map[i][j]) {
                // Make the cube
                var cube = new THREE.Mesh(cubeGeo, cubeMat);
                // Set the cube position
                cube.position.z = (i - totalCubesWide / 2) * UNITWIDTH + widthOffset;
                cube.position.y = heightOffset;
                cube.position.x = (j - totalCubesWide / 2) * UNITWIDTH + widthOffset;
                // Add the cube
                scene.add(cube);
                // Used later for collision detection
                collidableObjects.push(cube);
            }
        }
    }
    // Create the ground based on the map size the matrix/cube size produced
    mapSize = totalCubesWide * UNITWIDTH;
}


// Con esto creamos el suelo, a partir de la imagen suelo.jpg
function createGround() {
    var planeGeometry = new THREE.PlaneGeometry(mapSize,mapSize);
    var planeMaterial = new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( "images/suelo.png" ), color: 0xffffff, side: THREE.DoubleSide, shading: THREE.FlatShading } );
    planeMaterial.map.repeat.x = 20;
    planeMaterial.map.repeat.y = 10;
    planeMaterial.map.wrapS = THREE.RepeatWrapping;
    planeMaterial.map.wrapT = THREE.RepeatWrapping;
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.set(0,1,0);
    plane.rotation.x = degreesToRadians(90);
    plane.castShadow = false;
    plane.receiveShadow = true;
    scene.add( plane );
}


// Make the four perimeter walls for the maze
function createPerimWalls() {
    var halfMap = mapSize / 2;  // Half the size of the map
    var sign = 1;               // Used to make an amount positive or negative

    // Loop through twice, making two perimeter walls at a time
    for (var i = 0; i < 2; i++) {
        var perimGeo = new THREE.PlaneGeometry(mapSize, UNITHEIGHT);
        // Make the material double sided
        var perimMat = new THREE.MeshPhongMaterial({ color: 0x464646, side: THREE.DoubleSide });
        // Make two walls
        var perimWallLR = new THREE.Mesh(perimGeo, perimMat);
        var perimWallFB = new THREE.Mesh(perimGeo, perimMat);

        // Create left/right walls
        perimWallLR.position.set(halfMap * sign, UNITHEIGHT / 2, 0);
        perimWallLR.rotation.y = degreesToRadians(90);
        scene.add(perimWallLR);
        collidableObjects.push(perimWallLR);
        // Create front/back walls
        perimWallFB.position.set(0, UNITHEIGHT / 2, halfMap * sign);
        scene.add(perimWallFB);
        collidableObjects.push(perimWallFB);

        collidableObjects.push(perimWallLR);
        collidableObjects.push(perimWallFB);

        sign = -1; // Swap to negative value
    }
}

// Update the camera and renderer when the window changes size
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}





function animate() {
    render();
    requestAnimationFrame(animate);

    // Get the change in time between frames
    var delta = clock.getDelta();
    // Update our frames per second monitor

    // If the player is in dino's range, trigger the chase
    var isBeingChased = triggerChase();
    // If the player is too close, trigger the end of the game
    if (dino.position.distanceTo(controls.getObject().position) < CATCHOFFSET) {
        caught();
    // Player is at an undetected distance
    // Keep the dino moving and let the player keep moving too
    } else {
        animateDino(delta);
        animatePlayer(delta);
    }
}

// Render the scene
function render() {
    renderer.render(scene, camera);

}


// Make the dino chase the player
function triggerChase() {
    // Check if in dino agro range
    if (dino.position.distanceTo(controls.getObject().position) < 400) {
        // Adject the target's y value. We only care about x and z for movement.
        var lookTarget = new THREE.Vector3();
        lookTarget.copy(controls.getObject().position);
        lookTarget.y = dino.position.y;

        // Make dino face camera
            dino.lookAt(lookTarget);

        // Que el jugador sepa a cuanta distancia está el monstruo de tí. 
        // El juego termina cuando el monstruo te alcanza
        var distanceFrom = Math.round(dino.position.distanceTo(controls.getObject().position)) - CATCHOFFSET;
        // Alert and display distance between camera and dino
        dinoAlert.innerHTML = "El virus te ha visto! Esta a " + distanceFrom + "m de tí. ";
        dinoAlert.style.display = '';
        return true;
        // Not in agro range, don't start distance countdown
    } else {
        dinoAlert.style.display = 'none';
        return false;
    }
}

// Dino has caught the player. Turn on end prompt.
function caught() {
    blocker.style.display = '';
    instructions.innerHTML = "GAME OVER </br></br></br> Pulsa ESC para empezar de nuevo";
    gameOver = true;
    instructions.style.display = '';
    dinoAlert.style.display = 'none';
}



// Animate the player camera
function animatePlayer(delta) {
    // Gradual slowdown
    playerVelocity.x -= playerVelocity.x * 10.0 * delta;
    playerVelocity.z -= playerVelocity.z * 10.0 * delta;

    // If no collision and a movement key is being pressed, apply movement velocity
    if (detectPlayerCollision() == false) {
        if (moveForward) {
            playerVelocity.z -= PLAYERSPEED * delta;
        }
        if (moveBackward) playerVelocity.z += PLAYERSPEED * delta;
        if (moveLeft) playerVelocity.x -= PLAYERSPEED * delta;
        if (moveRight) playerVelocity.x += PLAYERSPEED * delta;

        controls.getObject().translateX(playerVelocity.x * delta);
        controls.getObject().translateZ(playerVelocity.z * delta);
    } else {
        // Collision or no movement key being pressed. Stop movememnt
        playerVelocity.x = 0;
        playerVelocity.z = 0;
    }
}


//  Determine if the player is colliding with a collidable object
function detectPlayerCollision() {
    // The rotation matrix to apply to our direction vector
    // Undefined by default to indicate ray should coming from front
    var rotationMatrix;
    // Get direction of camera
    var cameraDirection = controls.getDirection(new THREE.Vector3(0, 0, 0)).clone();

    // Check which direction we're moving (not looking)
    // Flip matrix to that direction so that we can reposition the ray
    if (moveBackward) {
        rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(degreesToRadians(180));
    }
    else if (moveLeft) {
        rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(degreesToRadians(90));
    }
    else if (moveRight) {
        rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(degreesToRadians(270));
    }

    // Player is moving forward, no rotation matrix needed
    if (rotationMatrix !== undefined) {
        cameraDirection.applyMatrix4(rotationMatrix);
    }

    // Apply ray to player camera
    var rayCaster = new THREE.Raycaster(controls.getObject().position, cameraDirection);

    // If our ray hit a collidable object, return true
    if (rayIntersect(rayCaster, PLAYERCOLLISIONDISTANCE)) {
        return true;
    } else {
        return false;
    }
}

// Apply movement to the dino, turning when collisions are made
function animateDino(delta) {
    // Gradual slowdown
    dinoVelocity.x -= dinoVelocity.x * 10.0 * delta;
    dinoVelocity.z -= dinoVelocity.z * 10.0 * delta;


    // If no collision, apply movement velocity
    if (detectDinoCollision() == false) {
        dinoVelocity.z += DINOSPEED * delta;
        // Move the dino
        dino.translateZ(dinoVelocity.z * delta);

    } else {
        // Collision. Adjust direction
        var directionMultiples = [-1, 1, 2];
        var randomIndex = getRandomInt(0, 2);
        var randomDirection = degreesToRadians(90 * directionMultiples[randomIndex]);

        dinoVelocity.z += DINOSPEED * delta;

        // Add the new direction
        dino.rotation.y += randomDirection;
    }
}


// Determine whether ornot dino is colliding with a wall
function detectDinoCollision() {
    // Get the rotation matrix from dino
    var matrix = new THREE.Matrix4();
    matrix.extractRotation(dino.matrix);
    // Create direction vector
    var directionFront = new THREE.Vector3(0, 0, -1);

    // Get the vectors coming from the front of the dino
    directionFront.applyMatrix4(matrix);

    // Create raycaster
    var rayCasterF = new THREE.Raycaster(dino.position, directionFront);


    // If we have a front collision, we have to adjust our direction so return true
    if (rayIntersect(rayCasterF, DINOCOLLISIONDISTANCE))
        return true;
    else
        return false;

}

// Takes a ray and sees if it's colliding with anything from the list of collidable objects
// Returns true if certain distance away from object
function rayIntersect(ray, distance) {
    var intersects = ray.intersectObjects(collidableObjects);
    for (var i = 0; i < intersects.length; i++) {
        if (intersects[i].distance < distance) {
            return true;
        }
    }
    return false;
}

// Generate a random integer within a range
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

// Converts degrees to radians
function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

// Converts radians to degrees
function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
}
