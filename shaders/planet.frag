precision mediump float;

varying vec3 position;
varying vec3 normal;
varying vec2 texture;

varying vec4 eyePosition;
varying vec4 eyeNormal;
varying vec4 lightEyePosition[8];

uniform float lightLuminosity[8];

uniform sampler2D textureSampler;

void main () {
	vec4 textureColor = texture2D(textureSampler, texture);

	vec4 N = normalize(eyeNormal);
	vec4 L = normalize(lightEyePosition[0] - eyePosition);
	vec4 E = normalize(eyePosition);
	float diffuseIllumination = 0.8 * max(0.0, dot(N, L));
	float haloIllumination = clamp(
					0.7 * pow( max(0.0, dot(E, normalize(L - 2.0 * max(0.0, dot(-N, L)) * -N))) , 3.0)
				, 0.0, 1.0);
	float specularIllumination = 0.01 * pow(dot(E, reflect(N, L)), 5.0);
	float ambientIllumination = 0.01;

	gl_FragColor = textureColor * clamp(
		 diffuseIllumination + ambientIllumination + specularIllumination + haloIllumination,
		0.0, 1.0);

}
