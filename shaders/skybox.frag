precision mediump float;

uniform sampler2D textureSampler;
varying vec2 texture;

void main () {
	vec4 textureColor = texture2D(textureSampler, texture);

	float gamma = 0.6;
	float brightness = 0.6;

	gl_FragColor = pow(textureColor, vec4(1.0/gamma)) * brightness;
}
