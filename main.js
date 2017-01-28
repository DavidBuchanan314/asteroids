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

/* Three.js Stuff */

var size = Math.min(window.innerWidth, window.innerHeight); // square aspect ratio;
var gameSize = 512; // relative value

var camera, scene, renderer, clock;

function init() {
	camera = new THREE.PerspectiveCamera( 90, 1, 1, 1000 );
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
	
	/* End Player Setup */
	
	scene = new THREE.Scene();
	scene.add( player.mesh );
	
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( size, size );
	renderer.setClearColor( 0xffffff, 1 );
	document.body.appendChild( renderer.domElement );

	clock = new THREE.Clock();
	loop();
}

function update() {
	var delta = clock.getDelta() * 60.0;

	if (key[code.UP]) {
		player.vel.x -= delta * player.accel * Math.sin(player.mesh.rotation.z);
		player.vel.y += delta * player.accel * Math.cos(player.mesh.rotation.z);
	}
	if (key[code.DOWN]) {
		player.vel.x += delta * player.accel * Math.sin(player.mesh.rotation.z);
		player.vel.y -= delta * player.accel * Math.cos(player.mesh.rotation.z);
	}
	if (key[code.LEFT])  player.rotVel += delta * player.rotAccel;
	if (key[code.RIGHT]) player.rotVel -= delta * player.rotAccel;

	player.rotVel *= Math.pow(player.dampRot, delta);
	player.vel.x *= Math.pow(player.dampVel, delta);
	player.vel.y *= Math.pow(player.dampVel, delta);

	player.mesh.rotation.z += delta * player.rotVel;
	player.mesh.position.x += delta * player.vel.x;
	player.mesh.position.y += delta * player.vel.y;
	
	/* Player Wraparound */
	if (player.mesh.position.x >  gameSize/2) player.mesh.position.x -= gameSize;
	if (player.mesh.position.x < -gameSize/2) player.mesh.position.x += gameSize;
	if (player.mesh.position.y >  gameSize/2) player.mesh.position.y -= gameSize;
	if (player.mesh.position.y < -gameSize/2) player.mesh.position.y += gameSize;
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
