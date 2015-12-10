uniform mat4 Model;
uniform mat4 View;
uniform mat4 Projection;

uniform vec3 lightPosition[8];

attribute vec3 vertexPosition;
attribute vec3 vertexNormal;
attribute vec2 vertexTexture;

varying vec3 position;
varying vec3 normal;
varying vec2 texture;

varying vec4 eyePosition;
varying vec4 eyeNormal;
varying vec4 lightEyePosition[8];

void main() {
	position = vertexPosition;
	normal = vertexNormal;
	texture = vertexTexture;

	mat4 PVM = Projection * View * Model;
	gl_Position = eyePosition = PVM * vec4(vertexPosition, 1.0);
	eyeNormal = PVM * vec4(normalize(vertexNormal), 0.0);
	for (int i = 0; i < 8; i++)
		lightEyePosition[i] = Projection * View * vec4(lightPosition[i], 1);
}
