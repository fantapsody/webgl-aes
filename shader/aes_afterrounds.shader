varying vec2 v_texcoord;
uniform sampler2D u_blk;
uniform sampler2D u_key;
uniform sampler2D u_tbox;
uniform float u_w;

float kvl = 11.0;

vec4 tbox(float s){
	s = coordfix(s);
	return texture2D(u_tbox, vec2(s, 0));
}

void main()
{
	vec4 blk1, blk2, blk3, blk4;
	vec4 a, b, c, d;
	vec4 key;
	float divisor = u_w * 2.0;
	float base = floor(v_texcoord.s * divisor / 8.0) * 8.0 / divisor;
	float ki = (v_texcoord.s - base) * divisor / 8.0;
	float ks = 1.0 - 0.5 / kvl;
	float s = (v_texcoord.s - base) * divisor;
	
	// get the round key
	key = texture2D(u_key, vec2(ki, ks));

	blk1 = texture2D(u_blk, vec2(base + 1.0 / divisor, v_texcoord.t));
	blk2 = texture2D(u_blk, vec2(base + 3.0 / divisor, v_texcoord.t));
	blk3 = texture2D(u_blk, vec2(base + 5.0 / divisor, v_texcoord.t));
	blk4 = texture2D(u_blk, vec2(base + 7.0 / divisor, v_texcoord.t));

	if(s < 2.0){
		a = tbox(blk1[0]);
		b = tbox(blk2[1]);
		c = tbox(blk3[2]);
		d = tbox(blk4[3]);
	} else if(s < 4.0){
		a = tbox(blk2[0]);
		b = tbox(blk3[1]);
		c = tbox(blk4[2]);
		d = tbox(blk1[3]);
	} else if(s < 6.0){
		a = tbox(blk3[0]);
		b = tbox(blk4[1]);
		c = tbox(blk1[2]);
		d = tbox(blk2[3]);
	} else {
		a = tbox(blk4[0]);
		b = tbox(blk1[1]);
		c = tbox(blk2[2]);
		d = tbox(blk3[3]);
	}
	if(s < 2.0){
		float t = blk4[3];
		gl_FragColor = texture2D(u_tbox, vec2(coordfix(240.49 / 255.0), 0.0));//;//vec4(a[2], b[2], c[2], d[2]);
		gl_FragColor = texture2D(u_tbox, vec2(coordfix(t), 0.0));//;//vec4(a[2], b[2], c[2], d[2]);
		//gl_FragColor = blk4;//vec4(a[2], b[2], c[2], d[2]);
		//if(t < 240.12/ 255.0)
		//	gl_FragColor.r = 0.5;
		//return;
	}
	gl_FragColor = vec4(xor(a[2], key[0]), xor(b[2], key[1]), xor(c[2], key[2]), xor(d[2], key[3]));
}
