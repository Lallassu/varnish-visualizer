//==============================================================================
// Author: Magnus Persson 
// Based on: https://github.com/dataarts/webgl-globe
//==============================================================================
"use strict";

function Point() {
    this.mesh;
    this.scale;
}

function Globe() {
    this.Shaders = {
        'earth': {
            uniforms: {
                'texture': { type: 't', value: null }
            },
            vertexShader: [
                'varying vec3 vNormal;',
                'varying vec2 vUv;',
                'void main() {',
                'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                'vNormal = normalize( normalMatrix * normal );',
                'vUv = uv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform sampler2D texture;',
                'varying vec3 vNormal;',
                'varying vec2 vUv;',
                'void main() {',
                'vec3 diffuse = texture2D( texture, vUv ).xyz/1.5;',
                'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
                'vec3 atmosphere = vec3( 0.4, 0.6, 0.7 ) * pow( intensity, 2.0 );',
                'gl_FragColor = vec4( (diffuse+atmosphere), 0.95 );',
                '}'
            ].join('\n')
        },
        'atmosphere': {
            uniforms: {
                'uTime': { type: 'f', value: null },
            },
            vertexShader: [
                'varying vec3 vNormal;',
                'void main() {',
                'vNormal = normalize( normalMatrix * normal );',
                'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vNormal;',
                'uniform float uTime;',
                'void main() {',
                'float intensity = pow( 0.85 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
                'gl_FragColor = vec4(0.4, 0.8, 0.6, 0.4) *intensity-clamp(sin(uTime)/2.0, 0.1,0.3)+0.2;',
                '}'
            ].join('\n')
        }
    };

    this.w;
    this.h;
    this.prev_pos = 0;
    this.container;
    this.scene;
    this.camera;
    this.renderer;
    this.clock;
    this.objects = [];
    this.draw_objects = [];
    this.view_angle = 60;
    this.aspect = this.screen_width / this.screen_height;
    this.near = 0.1;
    this.far = 500;
    this.inv_max_fps = 1 / 60;
    this.frameDelta = 0;
    this.update_end = 0;
    this.anim_id = 0;
    this.earth;
    this.atmosphere;
    this.mouse = { x: 0, y: 0 };
    this.mouseOnDown = { x: 0, y: 0 };
    this.rotation = { x: 0, y: 0 };
    this.target = { x: Math.PI * 3 / 2, y: Math.PI / 6.0 };
    this.targetOnDown = { x: 0, y: 0 };

    this.distance = 1000;
    this.distanceTarget = 1000;
    this.padding = 40;
    this.PI_HALF = Math.PI / 2;

    this.points = [];

    Globe.prototype.InitScene = function () {
        this.scene = new THREE.Scene();
        //this.scene.fog = new THREE.FogExp2(0x000000, 0.004);
        this.camera = new THREE.PerspectiveCamera(30, this.w / this.h, 1, 10000);
        this.camera.position.z = this.distance;
        //this.scene.add(this.camera);

        // Add earth
        var geometry = new THREE.SphereGeometry(200, 40, 30);
        var shader = this.Shaders['earth'];
        var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms['texture'].value = THREE.ImageUtils.loadTexture('world.jpg');
        var material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true,
        });
        this.earth = new THREE.Mesh(geometry, material);
        this.earth.rotation.y = Math.PI;
        this.scene.add(this.earth)

        // Add atmosphere
        shader = this.Shaders['atmosphere'];
        var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms['uTime'].value = 0;
        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        this.atmosphere = new THREE.Mesh(geometry, material);
        this.atmosphere.scale.set(1.1, 1.1, 1.1);
        this.scene.add(this.atmosphere);
    };

    Globe.prototype.onWindowResize = function (event) {
        this.w = container.offsetWidth || window.innerWidth;
        this.h = container.offsetHeight || window.innerHeight;
        this.camera.aspect = this.w / this.h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.w, this.h);
    };

    Globe.prototype.Init = function () {
        this.container = document.getElementById('container');
        this.w = container.offsetWidth || window.innerWidth;
        this.h = container.offsetHeight || window.innerHeight;
        this.clock = new THREE.Clock();


        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.w, this.h);
        this.renderer.setClearColor(0x000000);
        this.renderer.domElement.style.position = 'absolute';
        this.container.appendChild(this.renderer.domElement);
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        this.InitScene();
        this.animate();
    };

    Globe.prototype.addPoint = function (lat, lng, color) {
        // lat = 100 - Math.random() * 200;
        // lng = 100 - Math.random() * 200;
        var phi = (90 - lat) * Math.PI / 180;
        var theta = (180 - lng) * Math.PI / 180;
        var x = 200 * Math.sin(phi) * Math.cos(theta);
        var y = 200 * Math.cos(phi);
        var z = 200 * Math.sin(phi) * Math.sin(theta);

        var geometry = new THREE.SphereGeometry(5, 10, 10);
        var material = new THREE.MeshBasicMaterial({ color: color });
        var sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(x, y, z)

        var p = new Point();
        p.mesh = sphere;
        p.scale = 2.0;
        p.mesh.scale.set(p.scale, p.scale, p.scale);
        this.points.push(p);
        this.scene.add(p.mesh);
    };

    Globe.prototype.render = function () {
        this.renderer.render(this.scene, this.camera);
    };

    Globe.prototype.animate = function () {
        this.anim_id = requestAnimationFrame(this.animate.bind(this));
        this.render();
        this.update();
    };

    Globe.prototype.update = function () {
        var delta = this.clock.getDelta(),
            time = this.clock.getElapsedTime() * 10;

        this.frameDelta += delta;

        while (this.frameDelta >= this.inv_max_fps) {
            THREE.AnimationHandler.update(this.inv_max_fps);
            for (var i = 0; i < this.points.length; i++) {
                if (this.points[i] != undefined) {
                    if (this.points[i].scale <= 0) {
                        console.log("Remove point");
                        this.scene.remove(this.points[i].mesh);
                        this.points.splice(i, 1);
                    } else {
                        this.points[i].scale -= 0.5 * delta;
                        this.points[i].mesh.scale.set(
                            this.points[i].scale,
                            this.points[i].scale,
                            this.points[i].scale
                        );
                    }
                }
            }
            this.rotation.x += (this.target.x - this.rotation.x) * 0.1;
            this.rotation.y += (this.target.y - this.rotation.y) * 0.1;
            this.distance += (this.distanceTarget - this.distance) * 0.3;

            this.target.x += 0.01;

            this.camera.position.x = this.distance * Math.sin(this.rotation.x) * Math.cos(this.rotation.y);
            this.camera.position.y = this.distance * Math.sin(this.rotation.y);
            this.camera.position.z = this.distance * Math.cos(this.rotation.x) * Math.cos(this.rotation.y);

            this.atmosphere.material.uniforms.uTime.value += 0.02;
            this.camera.lookAt(this.earth.position)

            this.frameDelta -= this.inv_max_fps;
        }
    };
}
