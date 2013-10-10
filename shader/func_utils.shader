float rate = 255.0 / 256.0;
float fix = 1.0 / 512.0;

float coordfix(in float s){
	return s * rate + fix;
}
