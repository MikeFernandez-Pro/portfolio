uniform float uTime;

void main() {
    csm_Position.y +=  sin((position.x + 6.) * 5. - (uTime * 4.0)) * (1. / pow(position.x + 6., 2.)) * 0.5;
}
