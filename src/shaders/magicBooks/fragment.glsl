uniform vec3 uColor;
uniform float uProgress;

varying vec3 vModelPosition;

void main() { 

float bloomThickness = 0.05;

if (vModelPosition.y > uProgress) {
    csm_DiffuseColor = vec4(uColor, 1.0);
  }
  if (vModelPosition.y > uProgress + bloomThickness) {
    csm_DiffuseColor.a = 0.0;
  }


}