precision mediump float;

varying vec3 position;
varying vec3 normal;
varying vec2 texture;

varying vec3 lightDirection[8];
varying vec3 reflectedLightDirection[8];

varying vec3 cameraDirection;

uniform float lightLuminosity[8];

uniform sampler2D textureSampler;

void main () {
	vec4 textureColor = texture2D(textureSampler, texture);

	float ambientIllumination = 0.01;
	float diffuseIllumination = 1.0 * max(0.0, dot(lightDirection[0], normal));

	float gamma = 1.6;

	float brightness = ambientIllumination + diffuseIllumination;

	vec3 fragColor = vec3(0.0,0.0,0.0);
	if (brightness > 0.0) fragColor = pow(pow(vec3(textureColor), vec3(gamma)) * min(1.0, brightness), vec3(1.0/gamma));

	gl_FragColor = vec4(fragColor, textureColor[3]);

}
