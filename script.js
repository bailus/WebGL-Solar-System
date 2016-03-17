(function(document, window) {
	"use strict";	

	var sin = Math.sin, cos = Math.cos, π = Math.PI, nullFunc = function () {};

	var consoleElem = document.getElementById("console");
	var console = {
		info:  function (o) {
			var text = document.createTextNode(o);
			var line = document.createElement("div");
			line.appendChild(text);
			consoleElem.appendChild(line);
			line.scrollIntoView();
		},
		error: console ? console.error || nullFunc : nullFunc,
		log:   console ? console.log || nullFunc : nullFunc
	};

	// map({ k₀: v₀, k₁: v₁, ..., kᵢ: vᵢ }, f)  ->  { k₀: f(v₀, k₀), k₁: f(v₁, k₁), ..., kᵢ: f(vᵢ, kᵢ) }
	var map = function (object, f) { 
		var out = {};
		Object.keys(object).forEach(function (key) {
			out[key] = f(object[key], key);
		});
		return out;
	};

	// mapp([ v₀, v₁, ..., vᵢ ], f)  ->  { v₀: f(v₀, 0), v₁: f(v₁, 1), ..., vᵢ: f(vᵢ, i) }
	var mapp = function (array, f) { 
		var out = {};
		Object.keys(array).forEach(function (key) {
			out[array[key]] = f(array[key], key);
		});
		return out;
	}

	// Returns an array of consecutive integers (assumes α < β)
	// list(α, β)  ->  [ α, α+1, ..., β ]
	var list = function (α, β) {
		var out = new Array(β - α), i = 0;
		while (α <= β)
			out[i++] = α++;
		return out;
	}

	// merge({ a: 'x', b: 'z' }, { b: 'y', c: 'y' })  ->  { a: 'x', b: 'y', c: 'y' }
	var merge = function (/* Object, Object, ... */) {
		var out = {};
		for (var i = 0; i < arguments.length; i++) {
			var object = arguments[i];
			if (!object) continue;
			Object.keys(object).forEach(function (property) {
				out[property] = object[property];
			});
		}
		return out;
	};

	// flattenArray([ [ a, b ], c ])  ->  [ a, b, c ]
	var flattenArray = function (array) {
		return [].concat.apply([], array);
	};

	// HTML5 requestAnimationFrame based animation.
	// Runs func(prev, now) at most once every minTimeDelta milliseconds.
	// Note: browsers usually limit the framerate to the refresh rate, so this can be safely set to 120hz (= 1000/120 ms) or above.
	// For every numSamples times func is run, fpsFunc(fps) is run.
	var animate = function (minTimeDelta, numSamples, func, fpsFunc) {
		var stop = true;
		var samples = 0, sampleTimeDelta = 0, fps = 0;
		var requestFrame = function (prev, now) {
			if (now-prev >= minTimeDelta) {
				sampleTimeDelta += now-prev;
				if (++samples >= numSamples) {
					fps = numSamples*1e3/sampleTimeDelta;
					samples = 0; sampleTimeDelta = 0;
					if (fpsFunc) fpsFunc(fps);
				}
				func(prev, now, fps);
				prev = now;
			}
			if (stop) {
				samples = 0; sampleTimeDelta = 0; fps = 0;
			}
			else
				window.requestAnimationFrame(function (next) {
					requestFrame(prev, next);
				});
		};
		return {
			getFPS: function () {
				return fps;
			},
			stop: function () {
				stop = true;
			},
			start: function () {
				window.requestAnimationFrame(function (time) {
					stop = false;
					requestFrame(time, time);
				});
				return this;
			}

		};
	};

	var getPath = function (planet, target) {
		if (planet === target) return planet.name;

		var path;

		if (planet.satellites && planet.satellites.some(function (satellite) {
				path = getPath(satellite, target);
				return path;
			}))		
			return planet.name + '/' + path;
	};

	var getHTML = function (sun, planet) {
		var html = "";
		html += "<div class=planet>";
		html += '<div class=name><a href="#'+getPath(sun, planet)+'">'+(planet.name || "")+"</a></div>";
		html += "<dl>";
		html += ["luminosity", "radius", "rotationPeriod", "orbitalPeriod"].map(function (key) {
			if (planet[key] === undefined) return "";
			return "<dt>"+key+"</dt><dd>"+planet[key]+"</dd>";
		}).join("");
		html += "</dl>";

		if (planet.satellites && planet.satellites.length > 0) {
			html += "<div class=satellites>";
			html += Object.keys(planet.satellites).map(function (key) { return getHTML(sun, planet.satellites[key]); }).join("");
			html += "</div>";
		}

		html += "</div>";
		return html;
	};

	var loadFiles = function (files, onLoad) {
		console.info("Loading Shaders");
		var out = {};
		var loadFile = function (files) {
			var keys = Object.keys(files);
			var key = keys[0];
			if (keys.length === 0) return false;

			console.info("\t" + key + ": '" + files[key] + "'");

			var ajax = new XMLHttpRequest();
			ajax.open("GET",files[key],true);
			delete files[key];
			ajax.onload = function () {
				out[key] = ajax.responseText;

				if (!loadFile(files))
					onLoad(out);
			};
			ajax.send();

			return true;
		};
		loadFile(files);
	};

	var loadImages = function (textures, onLoad) {
		console.info("Loading Images");
		var out = {};
		var loadImage = function (textures) {
			var keys = Object.keys(textures);
			var name = keys[0];
			if (keys.length === 0) return false;

			var imagesrc = textures[name];
			delete textures[name];

			var image = new Image();
			image.onload = function () {
				console.info("\t" + name + ": '" + imagesrc + "'");
				out[name] = image;
				if (!loadImage(textures))
					onLoad(out);
			};
			image.src = imagesrc;

			return true;
		};
		loadImage(textures);
	};

	var loadTextures = function (gl, textures) {
		return map(textures, function (image, name) {
			var texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);
			texture.ready = true;
			return texture;
		});
	};

	var initGL = function (canvas, options) {
		var gl;
		(["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"]).some(function (name) {
			try { gl = canvas.getContext(name, options); } catch (e) {}
			return gl;
		});
		if (!gl) {
			alert("Unable to initialize WebGL. Your browser may not support it.");
			return;
		}
	
		gl.clearColor(0, 0, 0, 1);
		gl.enable(gl.DEPTH_TEST);

		return gl;
	};

	var setUniforms = function (gl, program, data) {
		Object.keys(data).forEach(function (key) {
			if(data[key].type == gl.uniformMatrix4fv)
				gl.uniformMatrix4fv(program.uniforms[key], false, data[key].data);
			else if(data[key].type == gl.uniform1i)
				gl.uniform1i(program.uniforms[key], data[key].data);
		});
	};

	var createPrograms = function (gl, shaders, shaderSources) {
		return map(shaders, function (config, programName) {
			var program = gl.createProgram();

			console.info("Creating program: " + programName);
			
			//create, compile .etc the vertex and fragment shaders
			program.shaders = map({
					"vertex": gl.VERTEX_SHADER,
					"fragment": gl.FRAGMENT_SHADER
				},
				function (type, t) {
					if (!config[t]) return;

					var shaderSource = shaderSources[config[t]];
					var shader = gl.createShader(type);
					gl.shaderSource(shader, shaderSource);
					gl.compileShader(shader);
					gl.attachShader(program, shader);
					
					console.info("\tCompiling " + t + " shader: " + config[t]);
					var log = gl.getShaderInfoLog(shader);
					if (log) console.error(log);
					return shader;
				});
			
			//link the program
			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				return;
				console.error("Could not initialise shaders");
			}
			else
				console.info("\tSuccess!");

			program.attributes = mapp(config.attributes, function (name) {
					return gl.getAttribLocation(program, name);
				});
			program.uniforms = mapp(config.uniforms, function (name) {
					return gl.getUniformLocation(program, name);
				});

			return program;
		});
	};

	var createBuffer = function (gl, config) {
		config.buffer = gl.createBuffer();
		
		gl.bindBuffer(config.target, config.buffer);
		gl.bufferData(config.target, config.data, gl.STATIC_DRAW);

		return config;
	};

	var buildSphere = function (gl, program, latitudeBands, longitudeBands) {

		console.info("Building shape: sphere\n\t"+latitudeBands+" latitude bands, "+longitudeBands+" longitude bands");

	    var position = [], index = [], texture = [];

		//calculate vertex positions
	    for (var lat=0; lat <= latitudeBands; lat++) {
	        var θ = lat * π / latitudeBands,
	        	sinθ = sin(θ),
	        	cosθ = cos(θ);

	        for (var long=0; long <= longitudeBands; long++) {
	            var ϕ = long * 2 * π / longitudeBands;
	            position.push(cos(ϕ) * sinθ, cosθ, sin(ϕ) * sinθ);
	        }
	    }

	    //create texture coordinate buffer
	    for (var lat=0; lat <= latitudeBands; lat++) {
	        for (var long=0; long <= longitudeBands; long++) {
	            texture.push(long/longitudeBands, lat/latitudeBands);
	        }
	    }

	    //create index buffer
	    for (var lat=0; lat < latitudeBands; lat++) {
	        for (var long=0; long < longitudeBands; long++)
	            index.push(
	            	(lat + 1) * (longitudeBands) + long,
	            	lat * (longitudeBands) + long
	            );
	    }

		console.info("\t" + position.length/3 + " position coordinates, " + texture.length/2 + " texture coordinates, " + index.length + " indices");

	    return {
		    	numVertices: index.length,
	    		buffers: {
	    			vertexPosition: createBuffer(gl, {
	    				data: new Float32Array(position),
	    				target: gl.ARRAY_BUFFER,
    					itemSize: 3
	    			}),
	    			vertexNormal: createBuffer(gl, {
	    				data: new Float32Array(position), //position and normal vectors are identical for a unit sphere
	    				target: gl.ARRAY_BUFFER,
    					itemSize: 3
	    			}),
	    			vertexTexture: createBuffer(gl, {
	    				data: new Float32Array(texture),
	    				target: gl.ARRAY_BUFFER,
    					itemSize: 2
	    			}),
	    			index: createBuffer(gl, {
	    				data: new Uint16Array(index),
	    				target: gl.ELEMENT_ARRAY_BUFFER,
    					itemSize: 3
	    			})
	    		},
				indexBuffer: "index",
				program: program,
				uniforms: { Model: { data: mat4.create(), type: gl.uniformMatrix4fv } },
				drawMode: gl.TRIANGLE_STRIP
		    };
	};

	var buildCircle = function (gl, program, segments) {

		console.info("Building shape: circle\n\t" + segments + " segments");

		var δ = 2*π / segments;
	    var positions = list(0, segments-1).map(function (segment) {
	        var θ = δ*segment;
	    	return [ sin(θ), 0, cos(θ) ];
	    });

		console.info("\t" + positions.length + " position coordinates");

		return {
			numVertices: segments,
			buffers: { 
				vertexPosition: createBuffer(gl, {
					data: new Float32Array(flattenArray(positions)),
					target: gl.ARRAY_BUFFER,
    				itemSize: 3
				})
			},
			program: program,
			uniforms: { Model: { data: mat4.create(), type: gl.uniformMatrix4fv } },
			drawMode: gl.LINE_LOOP
		};

	};

	//draw /shape/ to webgl context /gl/
	var drawShape = function (gl, shape, uniforms) {
		var program = shape.program;
		gl.useProgram(program);
		uniforms = merge(uniforms, shape.uniforms);

		if (shape.textures) map(shape.textures, function (texture, name) {
			if (!texture || !texture.ready) return;
			gl.bindTexture(gl.TEXTURE_2D, texture);
			uniforms[name] = { data: 0, type: gl.uniform1i };
		});

		setUniforms(gl, program, uniforms);

		if (shape.alpha) {
			gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
			gl.enable(gl.BLEND);
		}

		map(shape.buffers, function (buffer, name) {
			if (name === shape.indexBuffer) return;
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
			gl.vertexAttribPointer(program.attributes[name], buffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(program.attributes[name]);
		});

		if (shape.indexBuffer) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shape.buffers[shape.indexBuffer].buffer);
    		gl.drawElements(shape.drawMode, shape.numVertices, gl.UNSIGNED_SHORT, 0);
		} else {
			gl.drawArrays(shape.drawMode, 0, shape.numVertices);
		}

		if (shape.alpha) {
			gl.disable(gl.BLEND);
		}
	};

	var main = function (shaderSources, textures) { // main()
		var gl = initGL(document.getElementById("canvas"));

		textures = loadTextures(gl, textures);

		var programs = createPrograms(gl,
			{
				planet: { 
					vertex: "planetVert", 
					fragment: "planetFrag",
					attributes: [ "vertexPosition", "vertexNormal", "vertexTexture" ],
					uniforms: [ "Model", "View", "Projection", "textureSampler", "lightPosition", "lightLuminosity" ]
				},
				star: { 
					vertex: "starVert", 
					fragment: "starFrag",
					attributes: [ "vertexPosition", "vertexNormal", "vertexTexture" ],
					uniforms: [ "Model", "View", "Projection", "textureSampler" ]
				},
				simple: { 
					vertex: "simpleVert",
					fragment: "simpleFrag",
					attributes: [ "vertexPosition" ],
					uniforms: [ "Model", "View", "Projection" ]
				}
			}, shaderSources);

		var shapes = {
			planet: buildSphere(gl, programs.planet, 48, 96),
			star: buildSphere(gl, programs.star, 48, 96),
			orbit: buildCircle(gl, programs.simple, 1024),
			skybox: buildSphere(gl, programs.star, 48, 96)
		};
		shapes.skybox.textures = { textureSampler: textures.stars };
		shapes.skybox.uniforms = {
			Model: { data: mat4.create(), type: gl.uniformMatrix4fv },
			View: { data: mat4.lookAt(mat4.create(), [ 0, 0, 0 ], [ 0, 0, -1 ], [ 0, 1, 0 ]), type: gl.uniformMatrix4fv },
			Projection: { data: mat4.perspective(mat4.create(), π/2, 1024/768, 0.2, 2), type: gl.uniformMatrix4fv }
		};

		var lights = {

		};

		var uniforms = {
			View: { data: mat4.create(), type: gl.uniformMatrix4fv },
			Projection: { data: mat4.create(), type: gl.uniformMatrix4fv }
		};

		var scaleDistance = function (d) { return Math.cbrt(d); };
		var scaleSpeed = function (s) {
			return s === 0 ? 0 : 1/(Math.cbrt(s)*1000);
		};

		var sun = {
			name: "Sun",
			luminosity: 3846e23,
			radius: 1392684,
			rotationPeriod: 24.47*24,
			orbitalPeriod: 0,
			texture: textures.sun,
			satellites: [
				{	name: "Mercury",
					radius: 4878/2,
					orbitalDistance: 579e5,
					orbitalPeriod: 0.24*365,
					rotationPeriod: 58.65,
					texture: textures.mercury
				},
				{	name: "Venus",
					radius: 12104/2,
					orbitalDistance: 1082e5,
					rotationPeriod: -243,
					orbitalPeriod: 0.62*365,
					texture: textures.venus
				},
				{	name: "Earth",
					radius: 12756/2,
					orbitalDistance: 1496e5,
					orbitalPeriod: 1*365,
					rotationPeriod: 1,
					texture: textures.earth,
					satellites: [
						{	name: "Moon",
							radius: 1737.10/2,
							orbitalDistance: 38e4,
							orbitalPeriod: 27.3,
							rotationPeriod: 0,
							texture: textures.moon
						}
					]
				},
				{	name: "Mars",
					orbitalDistance: 2279e5,
					radius: 6787/2,
					rotationPeriod: 1.03,
					orbitalPeriod: 1.88*365,
					texture: textures.mars,
					satellites: [
						{	name: "Phobos",
							radius: 11.2667/2,
							orbitalDistance: 9400,
							orbitalPeriod: 7.65,
							rotationPeriod: 0,
							texture: textures.phobos
						}
					]
				},
				{	name: "Jupiter",
					radius: 1427960/2,
					orbitalPeriod: 11.86*365,
					orbitalDistance: 7783e5,
					rotationPeriod: 0.41,
					texture: textures.jupiter
					//satellites: [ ... ]
				},
				{	name: "Saturn",
					radius: 120660/2,
					orbitalDistance: 1427e6,
					orbitalPeriod: 29.46*365,
					rotationPeriod: 0.44,
					texture: textures.saturn
					//satellites: [ ... ]
				},
				{	name: "Uranus",
					radius: 51118/2,
					orbitalDistance: 2871e6,
					orbitalPeriod: 84.01*365,
					rotationPeriod: -0.72,
					texture: textures.uranus
					//satellites: [ ... ]
				},
				{	name: "Neptune",
					radius: 48600/2,
					orbitalDistance: 44971e5,
					orbitalPeriod: 164.8*365,
					rotationPeriod: 0.72,
					texture: textures.neptune
					//satellites: [ ... ]
				},
			],
		};

		document.getElementById("console").innerHTML = getHTML(sun, sun);

		var findPlanet = function (planet, address) {
			var f = function (planet, names) {
				if (planet.name == names[0])
					if (names.length > 1)
						names.shift();
					else
						return planet;

				if (planet.satellites) {
					var match;
					planet.satellites.forEach(function (satellite) {
						match = f(satellite, names) || match;
					});
					return match;
				}
			}
			return f(planet, address.split('/'));
		}

		var selected;
		window.onhashchange = function () {
			var hash = window.location.hash.slice(1);
			selected = findPlanet(sun, hash) || findPlanet(sun, 'Sun/Earth');
		}
		window.onhashchange();

		var draw = function (prev, now, fps) {

			var updatePlanets = function (planet, parentTransform) {
				parentTransform = parentTransform || { position: mat4.create() };

				planet.transform = {
					position: mat4.clone(parentTransform.position),
					surface: mat4.create(),
					orbit: mat4.create()
				}

				if (planet.orbitalPeriod) {
					mat4.rotateY(planet.transform.position, planet.transform.position, now*scaleSpeed(planet.orbitalPeriod));
				}
				if (planet.orbitalDistance) {
					var orbitalDistance = scaleDistance(planet.orbitalDistance);
					mat4.translate(planet.transform.position, planet.transform.position, [ 0, 0, orbitalDistance ]);

					mat4.scale(planet.transform.orbit, planet.transform.orbit, [ orbitalDistance, orbitalDistance, orbitalDistance ]);
					mat4.multiply(planet.transform.orbit, parentTransform.position, planet.transform.orbit);
				}
				if (planet.rotationPeriod) {
					mat4.rotateY(planet.transform.surface, planet.transform.surface, now*scaleSpeed(planet.rotationPeriod));
				}

				if (planet.radius) {
					var radius = scaleDistance(planet.radius);
					mat4.scale(planet.transform.surface, planet.transform.surface, [ radius, radius, radius ]);
					mat4.multiply(planet.transform.surface, planet.transform.position, planet.transform.surface);
				}

				if (planet.satellites)
					planet.satellites.forEach(function (satellite) {
						updatePlanets(satellite, planet.transform);
					});
			};

			var systemRadius = function (planet) {
				var r = planet.radius;
				if (planet.satellites)
					planet.satellites.forEach(function (satellite) {
						if (satellite.orbitalDistance > r) r = satellite.orbitalDistance;
					});
				return r;
			};
			
			var setUniforms = function (planet) {

				if (planet === selected) {
					var planetPosition = vec3.transformMat4(vec3.create(), [0,0,0], planet.transform.position);
					var r = systemRadius(planet);
					mat4.lookAt(
							uniforms.View.data, // out
							vec3.add(vec3.create(), planetPosition, [0,scaleDistance(r/8),scaleDistance((r*10)^(1/2))]),// eye
							planetPosition, // center
							[0,1,-1] // up
							);
					mat4.perspective(uniforms.Projection.data, π/2, 1024/768, scaleDistance(planet.radius), scaleDistance(1e11)); // out, fovy, aspect, near, far
					return true;
				}

				if (planet.satellites)
					if (planet.satellites.some(function (satellite) {
						return setUniforms(satellite);
					})) return true;

				return false;
			};

			var setLights = function (planet) {

				var lightPosition = [], lightLuminosity = [];

				var getLights = function (planet) {
					if (planet.luminosity && planet.position) {
						lightPosition.push(planet.position[0], planet.position[1], planet.position[2]);
						lightLuminosity.push(planet.luminosity);
					}

					if (planet.satellites)
						planet.satellites.forEach(getLights);
				};
				getLights(planet);

				uniforms.lightPosition = { type: gl.uniform3fv, data: new Float32Array(lightPosition) };
				uniforms.lightLuminosity = { type: gl.uniform1fv, data: new Float32Array(lightLuminosity) };
			};

			var drawPlanet = function (planet) {
				//draw the planets orbit
				shapes.orbit.uniforms.Model.data = planet.transform.orbit;
				drawShape(gl, shapes.orbit, uniforms);

				//draw the planets surface
				var shape = planet.luminosity ? shapes.star : shapes.planet;
				shape.textures = { textureSampler: planet.texture };
				shape.uniforms.Model.data = planet.transform.surface;
				drawShape(gl, shape, uniforms);

				//draw its satellites
				if (planet.satellites)
					planet.satellites.forEach(function (satellite) {
						drawPlanet(satellite);
					});
			};

			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			//draw skybox
			drawShape(gl, shapes.skybox, { View: {  } });

			gl.clear(gl.DEPTH_BUFFER_BIT);
			updatePlanets(sun);
			if (!setUniforms(sun)) {
				mat4.lookAt(uniforms.View.data, [0,scaleDistance(1e9),scaleDistance(8e9)], [0,-scaleDistance(5e8),0], [0,1e3,-1e3]); // out, eye, scale, up
				mat4.perspective(uniforms.Projection.data, π/2, 1024/768, scaleDistance(1e8), scaleDistance(1e16)); // out, fovy, aspect, near, far
			}
			setLights(sun);
			drawPlanet(sun);

		};

		var fpsElement = document.getElementById("fps");
		var lastFPS = 0;
		var drawFPS = function (fps) {
			if (fps === lastFPS) return; // we don't need to touch the DOM if the counter hasn't changed

			lastFPS = Math.round(fps)
			fpsElement.innerText = lastFPS;
		}

		var animation = animate(1e3/120, 60, draw, drawFPS).start();

	};
	loadFiles({
			planetVert: "shaders/planet.vert",
			planetFrag: "shaders/planet.frag",
			starVert: "shaders/star.vert",
			starFrag: "shaders/star.frag",
			simpleVert: "shaders/simple.vert",
			simpleFrag: "shaders/simple.frag"
		}, function (shaderSources) {
			loadImages({
				earth: "textures/earth.jpg",
				moon: "textures/moon.jpg",
				sun: "textures/sun.jpg",
				jupiter: "textures/jupiter.jpg",
				mars: "textures/mars.jpg",
				phobos: "textures/mars-phobos.jpg",
				neptune: "textures/neptune.jpg",
				saturn: "textures/saturn.jpg",
				venus: "textures/venus.jpg",
				stars: "textures/stars.jpg",
				uranus: "textures/uranus.jpg",
				mercury: "textures/mercury.jpg"
			}, function (textures) {
				main(shaderSources, textures);
			});
		});

})(document, window);
