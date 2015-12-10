uniform mat4 Model;
uniform mat4 View;
uniform mat4 Projection;

attribute vec3 vertexPosition;

void main() {
	gl_Position = Projection * View * Model * vec4(vertexPosition, 1.0);
}