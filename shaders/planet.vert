//IN
uniform mat4 Model;
uniform mat4 View;
uniform mat4 Projection;

attribute vec3 vertexPosition;
attribute vec3 vertexNormal;
attribute vec2 vertexTexture;

uniform vec3 lightPosition[8];


//OUT
varying vec3 position;
varying vec3 normal;
varying vec2 texture;

varying vec3 lightDirection[8];

void main() {
	mat4 PV = Projection * View;
	mat4 PVM = Projection * View * Model;

	gl_Position = PVM * vec4(vertexPosition, 1.0);

	position = vec3(Model * gl_Position);
	normal = normalize(vec3(Model * vec4(vertexNormal, 0.0)));
	texture = vertexTexture;

	for (int i = 0; i < 8; i++) {
		lightDirection[i] = normalize(lightPosition[i] - position);
	}
}
