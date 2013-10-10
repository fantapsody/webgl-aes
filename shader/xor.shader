varying vec2 v_texcoord;
uniform sampler2D u_pt;
uniform sampler2D u_ectr;

void main(){
	vec4 pt = texture2D(u_pt, v_texcoord);
	vec4 ectr = texture2D(u_ectr, v_texcoord);
	
	gl_FragColor = xor_vec4(pt, ectr);
}
