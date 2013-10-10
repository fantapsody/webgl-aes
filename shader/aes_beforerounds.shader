// if there are n pieces of data in one dimension,
// then the coordinate s of the ith(belongs to [0, n - 1]) piece of data in the dimesion is:
// s = (i * 2 + 1) / (2 * n)
varying vec2 v_texcoord;
uniform sampler2D u_pt;
uniform sampler2D u_key;
uniform float u_w;

void main(){
	vec4 blk, key;
	float divisor = u_w * 2.0;
	float base = floor(v_texcoord.s * divisor / 8.0) * 8.0 / divisor;
	float s = (v_texcoord.s - base) * divisor;
	blk = texture2D(u_pt, vec2(base + s / divisor, v_texcoord.t));
	key = texture2D(u_key, vec2(s / 8.0, 0));
	
	gl_FragColor = xor_vec4(blk, key);
}
