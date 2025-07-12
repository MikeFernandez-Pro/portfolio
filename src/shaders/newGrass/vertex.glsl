uniform vec4 uGrassParams;

void main() {
    int GRASS_SEGMENTS = int(uGrassParams.x);   
    int GRASS_VERTICES = int(uGrassParams.y);
    float GRASS_WIDTH = uGrassParams.z;
    float GRASS_HEIGHT = uGrassParams.w;

    // Figure out vertex id, > GRASS_VERTICES is other side
    int vertFB_ID = gl_VertexID % (GRASS_VERTICES * 2);
    int vertID = vertFB_ID % GRASS_VERTICES;

    // 0 - left, 1 - right
    int xTest = vertID & 0x1;
    int zTest = (vertFB_ID >= GRASS_VERTICES) ? 1 : -1;
    float xSide = float(xTest);
    float zSide = float(zTest);
    float heightPercent = float(vertID - xTest) / (float(GRASS_SEGMENTS) * 2.0);

    float width = GRASS_WIDTH;
    float height = GRASS_HEIGHT;

    // Calculate the vertex position
    float x = (xSide - 0.5) * width;
    float y = heightPercent * height;
    float z = 0.0;

    float offset = float(gl_InstanceID) * 0.5;
    vec3 grassLocalPosition = vec3(x + offset, y, z );

    gl_Position = projectionMatrix * modelViewMatrix * vec4(grassLocalPosition, 1.0);   


}   
