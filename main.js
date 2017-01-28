"use strict";

/* Keyboard Stuff */

var key = {};
window.onkeyup = function(e) { key[e.keyCode] = false; };
window.onkeydown = function(e) { key[e.keyCode] = true; };

var code = {
	UP: 87,
	DOWN: 83,
	LEFT: 65,
	RIGHT: 68,
	FIRE: 32
}

/* Game State Vars*/

var player = {
	rotVel: 0,
	dampRot: 0.85,
	dampVel: 0.93,
	vel: {x:0, y:0},
	accel: 0.5,
	rotAccel: 0.02
};
var asteroids = [];
var asteroidBaseVel = 2;

/* Three.js Stuff */

var size = Math.min(window.innerWidth, window.innerHeight); // square aspect ratio;
var gameSize = 512; // relative value

var camera, scene, renderer, clock, delta, particleSystem, options, spawnerOptions;
var particleTick = 0;

function init() {
	camera = new THREE.OrthographicCamera( -gameSize/2, gameSize/2, gameSize/2, -gameSize/2, 1, 1000 );
	camera.position.z = gameSize/2;

	/* Player Setup */

	var geometry = new THREE.Geometry();
	geometry.vertices.push( new THREE.Vector3( 0,  12,  0) ); // front
	geometry.vertices.push( new THREE.Vector3( 0,  -2,  0) ); // back
	geometry.vertices.push( new THREE.Vector3(-7, -5,  0) ); // left
	geometry.vertices.push( new THREE.Vector3( 7, -5,  0) ); // right
	geometry.faces.push( new THREE.Face3( 0, 2, 1 ) );
	geometry.faces.push( new THREE.Face3( 0, 1, 3 ) );
	
	var material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide} );
	
	player.mesh = new THREE.Mesh( geometry, material );
	
	/* Particle Initialisation */
	
	particleSystem = new THREE.GPUParticleSystem( {maxParticles: 5000} );
	
	options = {
		position: new THREE.Vector3(0, 0, 0),
		positionRandomness: 0,
		velocity: new THREE.Vector3(0, 5, 0),
		velocityRandomness: 0.6,
		color: 0x000000,
		colorRandomness: 0,
		turbulence: 0.5,
		lifetime: 20,
		size: 10,
		sizeRandomness: 1
	};
	
	scene = new THREE.Scene();
	scene.add( player.mesh );
	scene.add( particleSystem );
	
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( size, size );
	renderer.setClearColor( 0xffffff, 1 );
	document.body.appendChild( renderer.domElement );

	clock = new THREE.Clock();
	loop();
}

function spawnAsteroid( size ) {
	var asteroid = {
		vel: {
			x: ( Math.random() - 0.5 ) * asteroidBaseVel,
			y: ( Math.random() - 0.5 ) * asteroidBaseVel,
			r: 0.03 + Math.random() * 0.04,
		},
		size: size
	};

	var width = size / 1.7321; // sqrt(3)
	var geometry = new THREE.CubeGeometry( width, width, width );
	geometry.rotateX(Math.random()*2*Math.PI);
	geometry.rotateY(Math.random()*2*Math.PI);
	var material = new THREE.MeshBasicMaterial( {color: 0x000000} );
	asteroid.mesh = new THREE.Mesh( geometry, material );
	
	asteroid.mesh.rotation.x = Math.random()*2*Math.PI;
	asteroid.mesh.rotation.y = Math.random()*2*Math.PI;
	
	asteroid.mesh.position.x = ( gameSize + asteroid.size ) / 2;
	asteroid.mesh.position.y = ( gameSize + asteroid.size ) / 2;
	
	scene.add( asteroid.mesh );
	asteroids.push( asteroid );
}

function updateAsteroids() {
	asteroids.forEach( function( asteroid ) {
		asteroid.mesh.position.x += delta * asteroid.vel.x;
		asteroid.mesh.position.y += delta * asteroid.vel.y;
		asteroid.mesh.rotation.z += delta * asteroid.vel.r;
		
		wrapPosition( asteroid.mesh, asteroid.size );
	} );
}

function wrapPosition( mesh, deadzone ) {
	var wrapSize = gameSize + deadzone;
	if (mesh.position.x >  wrapSize/2) mesh.position.x -= wrapSize;
	if (mesh.position.x < -wrapSize/2) mesh.position.x += wrapSize;
	if (mesh.position.y >  wrapSize/2) mesh.position.y -= wrapSize;
	if (mesh.position.y < -wrapSize/2) mesh.position.y += wrapSize;
}

function updateParticles() {

	if ( key[code.UP] ) {
		options.position = player.mesh.position;
		options.velocity.x = Math.sin(player.mesh.rotation.z);
		options.velocity.y = -Math.cos(player.mesh.rotation.z);

		for (var i = 0; i < 50 * delta; i++) {
			particleSystem.spawnParticle(options);
		}
	}

	particleTick += delta / 2;
	particleSystem.update(particleTick);
}

function update() {
	delta = clock.getDelta() * 60.0;

	if ( key[code.UP] ) {
		player.vel.x -= delta * player.accel * Math.sin( player.mesh.rotation.z );
		player.vel.y += delta * player.accel * Math.cos( player.mesh.rotation.z );
	}

	if ( key[code.LEFT] )  player.rotVel += delta * player.rotAccel;
	if ( key[code.RIGHT] ) player.rotVel -= delta * player.rotAccel;

	player.rotVel *= Math.pow( player.dampRot, delta );
	player.vel.x  *= Math.pow( player.dampVel, delta );
	player.vel.y  *= Math.pow( player.dampVel, delta );

	player.mesh.rotation.z += delta * player.rotVel;
	player.mesh.position.x += delta * player.vel.x;
	player.mesh.position.y += delta * player.vel.y;
	
	wrapPosition( player.mesh, 0 );
	
	updateAsteroids();
	updateParticles();
}

function render() {
	renderer.render( scene, camera );
}

function loop() {
	requestAnimationFrame( loop );
	
	update();
	render();
}

window.onload = init;
