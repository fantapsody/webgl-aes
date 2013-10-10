uniform sampler2D u_xor;

float xor(in float s, in float t) {
	float v1, v2;
	s = coordfix(s);
	t = coordfix(t);
	// we do not use 16.0 here because 255 will be transformed to 1.0 and the
	// following code will not get the lower part correctly
    float fs = fract(s * 16.0);
    float ft = fract(t * 16.0);
    v1 = texture2D(u_xor, vec2(s, t)).a;
    v2 = texture2D(u_xor, vec2(fs, ft)).a;
    return v1 * 16.0 + v2;
}

vec4 xor_vec4(in vec4 a, in vec4 b){
	return vec4(xor(a.r, b.r), xor(a.g, b.g), xor(a.b, b.b), xor(a.a, b.a));
}
