precision mediump float;

// if there are n pieces of data in one dimension,
// then the coordinate s of the ith(belongs to [0, n - 1]) piece of data in the dimesion is:
// s = (i * 2 + 1) / (2 * n)
varying vec2 v_texcoord;
uniform sampler2D u_pt;
uniform sampler2D u_key;
uniform sampler2D u_xor;
uniform sampler2D u_tbox;
uniform float u_kvl;
uniform float u_w;

float xor(in float s, in float t) {
	vec4 v = texture2D(u_xor, vec2(s, t));
	return v.r;
}

vec4 xor(in vec4 a, in vec4 b){
	return vec4(xor(a.r, b.r), xor(a.g, b.g), xor(a.b, b.b), xor(a.a, b.a));
}

vec4 tbox(float s){
	return texture2D(u_tbox, vec2(s, 0));
}

void main(){
	vec4 a, b, c, d;
	vec4 t1, t2, t3, t4, blk1, blk2, blk3, blk4, key1, key2, key3, key4;
	// get the plain text
	float divisor = u_w * 2.0;
	float base = floor(v_texcoord.s * divisor / 8.0) * 8.0 / divisor;
	blk1 = texture2D(u_pt, vec2(base + 1.0 / divisor, v_texcoord.t));
	blk2 = texture2D(u_pt, vec2(base + 3.0 / divisor, v_texcoord.t));
	blk3 = texture2D(u_pt, vec2(base + 5.0 / divisor, v_texcoord.t));
	blk4 = texture2D(u_pt, vec2(base + 7.0 / divisor, v_texcoord.t));
		
	// get the round key
	key1 = texture2D(u_key, vec2(0.125, 0));
	key2 = texture2D(u_key, vec2(0.375, 0));
	key3 = texture2D(u_key, vec2(0.625, 0));
	key4 = texture2D(u_key, vec2(0.875, 0));
	
	// add round key
	blk1 = xor(blk1, key1);
	blk2 = xor(blk2, key2);
	blk3 = xor(blk3, key3);
	blk4 = xor(blk4, key4);

//	[loop][fastopt]
	for(int r = 0; r < 9; r++){
		// get the round key
		float ki = float(2 * (r + 1) + 1) / (u_kvl * 2.0);
		key1 = texture2D(u_key, vec2(0.125, ki));
		key2 = texture2D(u_key, vec2(0.375, ki));
		key3 = texture2D(u_key, vec2(0.625, ki));
		key4 = texture2D(u_key, vec2(0.875, ki));
	
		a = tbox(blk1[0]);
		b = tbox(blk2[1]);
		c = tbox(blk3[2]);
		d = tbox(blk4[3]);
		t1[0] = xor(xor(xor(xor(a[0], b[3]), c[2]), d[1]), key1[0]);
		t1[1] = xor(xor(xor(xor(a[1], b[0]), c[3]), d[2]), key1[1]);		
		t1[2] = xor(xor(xor(xor(a[2], b[1]), c[0]), d[3]), key1[2]);
		t1[3] = xor(xor(xor(xor(a[3], b[2]), c[1]), d[0]), key1[3]);
		
		a = tbox(blk2[0]);
		b = tbox(blk3[1]);
		c = tbox(blk4[2]);
		d = tbox(blk1[3]);
		t2[0] = xor(xor(xor(xor(a[0], b[3]), c[2]), d[1]), key2[0]);
		t2[1] = xor(xor(xor(xor(a[1], b[0]), c[3]), d[2]), key2[1]);		
		t2[2] = xor(xor(xor(xor(a[2], b[1]), c[0]), d[3]), key2[2]);
		t2[3] = xor(xor(xor(xor(a[3], b[2]), c[1]), d[0]), key2[3]);
		
		a = tbox(blk3[0]);
		b = tbox(blk4[1]);
		c = tbox(blk1[2]);
		d = tbox(blk2[3]);
		t3[0] = xor(xor(xor(xor(a[0], b[3]), c[2]), d[1]), key3[0]);
		t3[1] = xor(xor(xor(xor(a[1], b[0]), c[3]), d[2]), key3[1]);		
		t3[2] = xor(xor(xor(xor(a[2], b[1]), c[0]), d[3]), key3[2]);
		t3[3] = xor(xor(xor(xor(a[3], b[2]), c[1]), d[0]), key3[3]);
		
		a = tbox(blk4[0]);
		b = tbox(blk1[1]);
		c = tbox(blk2[2]);
		d = tbox(blk3[3]);
		t4[0] = xor(xor(xor(xor(a[0], b[3]), c[2]), d[1]), key4[0]);
		t4[1] = xor(xor(xor(xor(a[1], b[0]), c[3]), d[2]), key4[1]);		
		t4[2] = xor(xor(xor(xor(a[2], b[1]), c[0]), d[3]), key4[2]);
		t4[3] = xor(xor(xor(xor(a[3], b[2]), c[1]), d[0]), key4[3]);
		
		blk1 = t1;
		blk2 = t2;
		blk3 = t3;
		blk4 = t4;
	}
	
	float s = (v_texcoord.s - base) * divisor;
	float ks = 1.0 - 0.5 / u_kvl;
	if(s < 2.0){
		key1 = texture2D(u_key, vec2(0.125, ks));
		a = tbox(blk1[0]);
		b = tbox(blk2[1]);
		c = tbox(blk3[2]);
		d = tbox(blk4[3]);
		gl_FragColor = vec4(xor(a[2], key1[0]), xor(b[2], key1[1]), xor(c[2], key1[2]), xor(d[2], key1[3]));
	} else if(s < 4.0){
		key1 = texture2D(u_key, vec2(0.375, ks));
		a = tbox(blk2[0]);
		b = tbox(blk3[1]);
		c = tbox(blk4[2]);
		d = tbox(blk1[3]);
		gl_FragColor = vec4(xor(a[2], key1[0]), xor(b[2], key1[1]), xor(c[2], key1[2]), xor(d[2], key1[3]));
	} else if(s < 6.0){
		key1 = texture2D(u_key, vec2(0.625, ks));
		a = tbox(blk3[0]);
		b = tbox(blk4[1]);
		c = tbox(blk1[2]);
		d = tbox(blk2[3]);
		gl_FragColor = vec4(xor(a[2], key1[0]), xor(b[2], key1[1]), xor(c[2], key1[2]), xor(d[2], key1[3]));
	} else {
		key1 = texture2D(u_key, vec2(0.875, ks));
		a = tbox(blk4[0]);
		b = tbox(blk1[1]);
		c = tbox(blk2[2]);
		d = tbox(blk3[3]);
		gl_FragColor = vec4(xor(a[2], key1[0]), xor(b[2], key1[1]), xor(c[2], key1[2]), xor(d[2], key1[3]));
	}	
}
