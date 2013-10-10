uniform sampler2D u_xor;

float xor(in float s, in float t){
	s = coordfix(s);
	t = coordfix(t);
	return texture2D(u_xor, vec2(s, t)).a;
}

vec4 xor_vec4(in vec4 a, in vec4 b){
	return vec4(xor(a.r, b.r), xor(a.g, b.g), xor(a.b, b.b), xor(a.a, b.a));
}
