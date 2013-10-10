varying vec2 v_texcoord;
uniform sampler2D u_blk;
uniform sampler2D u_key;
uniform sampler2D u_tbox;
uniform float u_w;
uniform int u_r;

float kvl = 11.0;

vec4 tbox(float s){
	s = coordfix(s);
	return texture2D(u_tbox, vec2(s, 0));
}

void main()
{
	/* vec4 key1, key2, key3, key4; */
	vec4 key;
	vec4 a, b, c, d;
	vec4 r;
	vec4 blk1, blk2, blk3, blk4;

	float divisor = u_w * 2.0;
	float base = floor(v_texcoord.s * divisor / 8.0) * 8.0 / divisor;
	float s = (v_texcoord.s - base) * divisor;
	float ki = float(2 * (u_r + 1) + 1) / (kvl * 2.0);
	float ks = s / 8.0;

	blk1 = texture2D(u_blk, vec2(base + 1.0 / divisor, v_texcoord.t));
	blk2 = texture2D(u_blk, vec2(base + 3.0 / divisor, v_texcoord.t));
	blk3 = texture2D(u_blk, vec2(base + 5.0 / divisor, v_texcoord.t));
	blk4 = texture2D(u_blk, vec2(base + 7.0 / divisor, v_texcoord.t));

	key = texture2D(u_key, vec2(ks, ki));
	if(s < 2.0){
		a = tbox(blk1[0]);
		b = tbox(blk2[1]);
		c = tbox(blk3[2]);
		d = tbox(blk4[3]);
	}
	else if(s < 4.0){
		a = tbox(blk2[0]);
		b = tbox(blk3[1]);
		c = tbox(blk4[2]);
		d = tbox(blk1[3]);
	}
	else if(s < 6.0){
		a = tbox(blk3[0]);
		b = tbox(blk4[1]);
		c = tbox(blk1[2]);
		d = tbox(blk2[3]);
	}
	else{
		a = tbox(blk4[0]);
		b = tbox(blk1[1]);
		c = tbox(blk2[2]);
		d = tbox(blk3[3]);
	}
	
	r[0] = xor(xor(xor(a[0], b[3]), xor(c[2], d[1])), key[0]);
	r[1] = xor(xor(xor(a[1], b[0]), xor(c[3], d[2])), key[1]);		
	r[2] = xor(xor(xor(a[2], b[1]), xor(c[0], d[3])), key[2]);
	r[3] = xor(xor(xor(a[3], b[2]), xor(c[1], d[0])), key[3]);

	gl_FragColor = r;
}
