attribute vec2 a_position;
uniform vec2 u_resolution;

varying vec2 v_texcoord;
varying float u_w;

void main(){
	v_texcoord = a_position + vec2(1.0, 1.0);
	v_texcoord = v_texcoord / vec2(2.0, 2.0);
	gl_Position = vec4(a_position.x, a_position.y, 0, 1.0);
}
