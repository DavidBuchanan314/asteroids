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

var bullets = [];
var bulletVel = 5;
var lastBullet = 0;
var bulletRate= 0.2;
var bulletLifespan = 100;

/* Three.js Stuff */

var size = Math.min(window.innerWidth, window.innerHeight); // square aspect ratio;
var gameSize = 512; // relative value

var camera, scene, renderer, clock, delta, particleSystem, options, spawnerOptions;
var particleTick = 0;

var SQRT3 = Math.sqrt(3);

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
	player.mesh.position.z = 100;
	
	/* Particle Initialisation */
	
	particleSystem = new THREE.GPUParticleSystem( {maxParticles: 5000} );
	
	options = {
		position: new THREE.Vector3(0, 0, 0),
		positionRandomness: 0,
		velocity: new THREE.Vector3(0, 0, 0),
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
	
	for (var i = 0; i < 25; i++) {
		spawnAsteroid( Math.random() * 80 + 30, null );
	}
	
	loop();
}

function spawnAsteroid( size, position ) {
	var asteroid = {
		vel: {
			x: ( Math.random() - 0.5 ) * asteroidBaseVel,
			y: ( Math.random() - 0.5 ) * asteroidBaseVel,
			r: 0.03 + Math.random() * 0.04,
		},
		size: size,
		health: size
	};

	var width = size / SQRT3;
	var geometry = new THREE.CubeGeometry( width, width, width );
	
	geometry.rotateX(Math.random()*2*Math.PI);
	geometry.rotateY(Math.random()*2*Math.PI);
	
	var material = new THREE.MeshBasicMaterial( {
		color: 0xFFFFFF,
		transparent: true,
		blending: THREE.CustomBlending,
		blendEquation: THREE.SubtractEquation,
		blendSrc: THREE.OneFactor,
		blendDst: THREE.OneFactor,
		depthTest: false,
	} );
	asteroid.mesh = new THREE.Mesh( geometry, material );
	
	asteroid.mesh.rotation.x = Math.random()*2*Math.PI;
	asteroid.mesh.rotation.y = Math.random()*2*Math.PI;
	
	asteroid.mesh.position.x = ( gameSize + asteroid.size ) / 2;
	asteroid.mesh.position.y = ( gameSize + asteroid.size ) / 2;
	
	if ( position == null ) {
		if ( Math.random() > 0.5 ) {
			asteroid.mesh.position.x *= (Math.random() - 0.5) * 2;
		} else {
			asteroid.mesh.position.y *= (Math.random() - 0.5) * 2;
		}
	} else {
		asteroid.mesh.position.x = position.x;
		asteroid.mesh.position.y = position.y;
	}
	
	scene.add( asteroid.mesh );
	asteroids.push( asteroid );
}

function destroyAsteroid( asteroid ) {
	scene.remove( asteroid.mesh );
	asteroids.splice( asteroids.indexOf( asteroid ), 1 );
	
	var options = {
		position: asteroid.mesh.position,
		positionRandomness: 5.0,
		velocity: new THREE.Vector3(0, 0, 0),
		velocityRandomness: 0.6,
		color: 0x000000,
		colorRandomness: 0,
		turbulence: 0.5,
		lifetime: 20,
		size: 10,
		sizeRandomness: 1
	};
	
	for ( var i = 0; i < asteroid.size * 100; i++) {
		particleSystem.spawnParticle( options );
	}
	
	for ( var r = asteroid.size * 0.6; r > 30; r *= 0.6 ) {
		spawnAsteroid( Math.random() * (asteroid.size - 30) * 0.5 + 30, asteroid.mesh.position );
	}
}

function updateAsteroids() {
	var playerCollision = false;
	asteroids.forEach( function( asteroid ) {
		asteroid.mesh.position.x += delta * asteroid.vel.x;
		asteroid.mesh.position.y += delta * asteroid.vel.y;
		asteroid.mesh.rotation.z += delta * asteroid.vel.r;
		
		wrapPosition( asteroid.mesh, asteroid.size );
		
		var dist = getDistanceSquared( asteroid.mesh.position, player.mesh.position );
		var radius = ( asteroid.size * 0.5 ) / 2;
		
		if ( dist < (radius+5) * (radius+5) ) {
			playerCollision = true;
		}
		
		var bulletCollision = false;
		
		bullets.forEach( function( bullet ) {
			dist = getDistanceSquared( asteroid.mesh.position, bullet.mesh.position );
			if ( dist < radius * radius ) {
				bulletCollision = true;
				destroyBullet( bullet );
			}
		} );
		
		if ( bulletCollision ) destroyAsteroid( asteroid );
		
	} );
}

function spawnBullet() {
	var bullet = {
		vel: {
			x: -bulletVel * Math.sin(player.mesh.rotation.z) + player.vel.x,
			y: +bulletVel * Math.cos(player.mesh.rotation.z) + player.vel.y,
		},
		age: 0
	};
	
	var geometry = new THREE.CubeGeometry( 5, 5, 5 );
	var material = new THREE.MeshBasicMaterial( {color: 0x000000} );
	bullet.mesh = new THREE.Mesh( geometry, material );
	
	bullet.mesh.position.x = player.mesh.position.x;
	bullet.mesh.position.y = player.mesh.position.y;
	
	scene.add( bullet.mesh );
	bullets.push( bullet );
}

function destroyBullet( bullet ) {
	scene.remove( bullet.mesh );
	bullets.splice( bullets.indexOf( bullet ), 1 );
}

function updateBullets() {
	bullets.forEach( function( bullet ) {
		bullet.mesh.position.x += delta * bullet.vel.x;
		bullet.mesh.position.y += delta * bullet.vel.y;
		bullet.mesh.rotation.z += 0.3;
		
		wrapPosition( bullet.mesh, 0 );
		
		bullet.age += delta;
		
		if ( bullet.age > bulletLifespan ) destroyBullet( bullet );
		
	} );
}

function wrapPosition( mesh, deadzone ) {
	var wrapSize = gameSize + deadzone;
	if (mesh.position.x >  wrapSize/2) mesh.position.x -= wrapSize;
	if (mesh.position.x < -wrapSize/2) mesh.position.x += wrapSize;
	if (mesh.position.y >  wrapSize/2) mesh.position.y -= wrapSize;
	if (mesh.position.y < -wrapSize/2) mesh.position.y += wrapSize;
}

function getDistanceSquared( a, b ) { // 2d distance in xy plane
	return ( a.x - b.x )
	     * ( a.x - b.x )
	     + ( a.y - b.y )
	     * ( a.y - b.y );
}

function updateParticles() {

	if ( key[code.UP] ) {
		options.position = player.mesh.position;
		options.velocity.x =  Math.sin(player.mesh.rotation.z);
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
	
	if ( key[code.FIRE] ) {
		if ( clock.getElapsedTime() - lastBullet > bulletRate ) {
			spawnBullet();
			lastBullet = clock.getElapsedTime();
		}
	} else {
		lastBullet = 0;
	}

	player.rotVel *= Math.pow( player.dampRot, delta );
	player.vel.x  *= Math.pow( player.dampVel, delta );
	player.vel.y  *= Math.pow( player.dampVel, delta );

	player.mesh.position.x += delta * player.vel.x;
	player.mesh.position.y += delta * player.vel.y;
	player.mesh.rotation.z += delta * player.rotVel;
	
	wrapPosition( player.mesh, 0 );
	
	updateAsteroids();
	updateBullets();
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
