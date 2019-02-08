var DAT = DAT || {};
function Globe() {
    var Shaders = {
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
                'vec3 atmosphere = vec3( 0.1, 0.1, 1.0 ) * pow( intensity, 3.0 );',
                'gl_FragColor = vec4( (diffuse+atmosphere), 0.6 );',
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
                'float intensity = pow( 0.85 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 8.0 );',
                'gl_FragColor = vec4(0.7, 0.7, 0.9, 0.9) *intensity-clamp(sin(uTime)+vNormal.x*vNormal.y, 0.2,0.9);',
                '}'
            ].join('\n')
        }
    };

    var atmoMesh;
    var camera, scene, renderer, w, h;
    var mesh, atmosphere, point;

    var overRenderer;

    var curZoomSpeed = 0;
    var zoomSpeed = 50;

    var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
    var rotation = { x: 0, y: 0 },
        target = { x: Math.PI * 3 / 2, y: Math.PI / 6.0 },
        targetOnDown = { x: 0, y: 0 };

    var distance = 100000, distanceTarget = 100000;
    var padding = 40;
    var PI_HALF = Math.PI / 2;

    Globe.prototype.init = function () {
        container.style.color = '#fff';
        container.style.font = '13px/20px Arial, sans-serif';

        var shader, uniforms, material;
        w = container.offsetWidth || window.innerWidth;
        h = container.offsetHeight || window.innerHeight;

        camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
        camera.position.z = distance;
        scene = new THREE.Scene();

        var geometry = new THREE.SphereGeometry(200, 40, 30);
        shader = Shaders['earth'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms['texture'].value = THREE.ImageUtils.loadTexture('world.jpg');
        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true,
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI;
        scene.add(mesh);

        shader = Shaders['atmosphere'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms['uTime'].value = 0;
        material = new THREE.ShaderMaterial({

            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true

        });

        atmoMesh = new THREE.Mesh(geometry, material);
        atmoMesh.scale.set(1.1, 1.1, 1.1);
        scene.add(atmoMesh);

        geometry = new THREE.BoxGeometry(0.75, 0.75, 1);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

        point = new THREE.Mesh(geometry);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);

        renderer.domElement.style.position = 'absolute';
        container.appendChild(renderer.domElement);
        container.addEventListener('mousedown', onMouseDown, false);
        document.addEventListener('keydown', onDocumentKeyDown, false);
        window.addEventListener('resize', onWindowResize, false);

        container.addEventListener('mouseover', function () {
            overRenderer = true;
        }, false);

        container.addEventListener('mouseout', function () {
            overRenderer = false;
        }, false);
    }

    //function addData(data, opts) {
    //    var lat, lng, size, color, i, step, colorFnWrapper;

    //    opts.animated = opts.animated || false;
    //    this.is_animated = opts.animated;
    //    opts.format = opts.format || 'magnitude'; // other option is 'legend'
    //    if (opts.format === 'magnitude') {
    //        step = 3;
    //        colorFnWrapper = function (data, i) { return colorFn(data[i + 2]); }
    //    } else if (opts.format === 'legend') {
    //        step = 4;
    //        colorFnWrapper = function (data, i) { return colorFn(data[i + 3]); }
    //    } else {
    //        throw ('error: format not supported: ' + opts.format);
    //    }

    //    if (opts.animated) {
    //        if (this._baseGeometry === undefined) {
    //            this._baseGeometry = new THREE.Geometry();
    //            for (i = 0; i < data.length; i += step) {
    //                lat = data[i];
    //                lng = data[i + 1];
    //                //        size = data[i + 2];
    //                color = colorFnWrapper(data, i);
    //                size = 0;
    //                addPoint(lat, lng, size, color, this._baseGeometry);
    //            }
    //        }
    //        if (this._morphTargetId === undefined) {
    //            this._morphTargetId = 0;
    //        } else {
    //            this._morphTargetId += 1;
    //        }
    //        opts.name = opts.name || 'morphTarget' + this._morphTargetId;
    //    }
    //    var subgeo = new THREE.Geometry();
    //    for (i = 0; i < data.length; i += step) {
    //        lat = data[i];
    //        lng = data[i + 1];
    //        color = colorFnWrapper(data, i);
    //        size = data[i + 2];
    //        size = size * 200;
    //        addPoint(lat, lng, size, color, subgeo);
    //    }
    //    if (opts.animated) {
    //        this._baseGeometry.morphTargets.push({ 'name': opts.name, vertices: subgeo.vertices });
    //    } else {
    //        this._baseGeometry = subgeo;
    //    }
    //};

    //function createPoints() {
    //    if (this._baseGeometry !== undefined) {
    //        if (this.is_animated === false) {

    //            this.points = new THREE.Mesh(this._baseGeometry,
    //                new THREE.MeshBasicMaterial({
    //                    color: 0xffffff,
    //                    vertexColors: THREE.FaceColors,
    //                    morphTargets: false
    //                }));
    //        } else {
    //            if (this._baseGeometry.morphTargets.length < 8) {
    //                console.log('t l', this._baseGeometry.morphTargets.length);
    //                var padding = 8 - this._baseGeometry.morphTargets.length;
    //                console.log('padding', padding);
    //                for (var i = 0; i <= padding; i++) {
    //                    console.log('padding', i);
    //                    this._baseGeometry.morphTargets.push({ 'name': 'morphPadding' + i, vertices: this._baseGeometry.vertices });
    //                }
    //            }
    //            this.points = new THREE.Mesh(this._baseGeometry,
    //                new THREE.MeshBasicMaterial({
    //                    color: 0xffffff,
    //                    vertexColors: THREE.FaceColors,
    //                    morphTargets: true
    //                }));
    //        }
    //        scene.add(this.points);
    //    }
    //}

    //function addPoint(lat, lng, size, color, subgeo) {

    //    var phi = (90 - lat) * Math.PI / 180;
    //    var theta = (180 - lng) * Math.PI / 180;

    //    point.position.x = 200 * Math.sin(phi) * Math.cos(theta);
    //    point.position.y = 200 * Math.cos(phi);
    //    point.position.z = 200 * Math.sin(phi) * Math.sin(theta);

    //    point.lookAt(mesh.position);

    //    point.scale.z = Math.max(size, 0.1); // avoid non-invertible matrix
    //    point.updateMatrix();

    //    for (var i = 0; i < point.geometry.faces.length; i++) {

    //        point.geometry.faces[i].color = color;

    //    }
    //    if (point.matrixAutoUpdate) {
    //        point.updateMatrix();
    //    }
    //    subgeo.merge(point.geometry, point.matrix);
    //}

    Globe.prototype.onMouseDown = function (event) {
        event.preventDefault();

        container.addEventListener('mousemove', onMouseMove, false);
        container.addEventListener('mouseup', onMouseUp, false);
        container.addEventListener('mouseout', onMouseOut, false);

        mouseOnDown.x = - event.clientX;
        mouseOnDown.y = event.clientY;

        targetOnDown.x = target.x;
        targetOnDown.y = target.y;

        container.style.cursor = 'move';
    };

    function onMouseMove(event) {
        mouse.x = - event.clientX;
        mouse.y = event.clientY;

        var zoomDamp = distance / 1000;

        target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
        target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

        target.y = target.y > PI_HALF ? PI_HALF : target.y;
        target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
    };

    Globe.prototype.onMouseUp = function (event) {
        container.removeEventListener('mousemove', onMouseMove, false);
        container.removeEventListener('mouseup', onMouseUp, false);
        container.removeEventListener('mouseout', onMouseOut, false);
        container.style.cursor = 'auto';
    };

    Globe.prototype.onMouseOut = function (event) {
        container.removeEventListener('mousemove', onMouseMove, false);
        container.removeEventListener('mouseup', onMouseUp, false);
        container.removeEventListener('mouseout', onMouseOut, false);
    };

    Globe.prototype.onWindowResize = function (event) {
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
    };

    Globe.prototype.animate = function () {
        requestAnimationFrame(animate);
        render();
    };
    Game.prototype.animate = function () {
        this.anim_id = requestAnimationFrame(this.animate.bind(this));
        this.render();
        this.update();
    };

    Globe.prototype.update = function () {

        rotation.x += (target.x - rotation.x) * 0.1;
        rotation.y += (target.y - rotation.y) * 0.1;
        distance += (distanceTarget - distance) * 0.3;
        target.x += 0.01;
        atmoMesh.material.uniforms.uTime.value += 0.02;

        camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
        camera.position.y = distance * Math.sin(rotation.y);
        camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

        camera.lookAt(mesh.position);

        renderer.render(scene, camera);
    };
}