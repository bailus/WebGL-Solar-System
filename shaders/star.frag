precision mediump float;

varying vec3 position;
varying vec3 normal;
varying vec2 texture;

varying vec4 eyePosition;
varying vec4 eyeNormal;

uniform sampler2D textureSampler;

void main () {
	vec4 textureColor = texture2D(textureSampler, texture);

	vec4 N = normalize(eyeNormal);
	vec4 L = normalize(-eyePosition);
	vec4 R = reflect(L, N);
	vec4 diffuseIllumination = vec4(vec3(1.0,1.0,1.0) * clamp(dot(N, L), 0.0, 1.0), 1.0);

	gl_FragColor = clamp(textureColor * (diffuseIllumination * 0.8 + 0.6), 0.0, 1.0);

}
