
import { Box, Instance, Instances, Line, Points, ScreenQuad, shaderMaterial } from "@react-three/drei";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useControls } from "leva";
import { useEffect, useRef } from "react";
import * as THREE from "three"
const Sparks = (props) => {

    const texture = useLoader(THREE.TextureLoader, "/textures/particles/16.png")

    const particlesCount = 100

    const geometry = new THREE.BufferGeometry()

    const positions = new Float32Array(particlesCount * 3)

    for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3

        positions[i3 + 0] =  -3.88
        positions[i3 + 1] = 1.8
        positions[i3 + 2] = -12.7
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const count = geometry.attributes.position.count
    const randoms = new Float32Array(count)
    const randomSpeeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
        randoms[i] = Math.random() * Math.PI / 3 + Math.PI / 3
        randomSpeeds[i] = Math.random() * (9) + 1; // Math.random() * (max - min) + min;
    }

    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
    geometry.setAttribute('aRandomSpeed', new THREE.BufferAttribute(randomSpeeds, 1))

    const material = new THREE.ShaderMaterial({
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        side: THREE.DoubleSide,
        uniforms: {
            uTexture: { value: texture },
            uTranslation: { value: 0 },
        },
        vertexShader: `
        #define PI 3.1415926535897932384626433832795
        uniform float uTranslation;
        attribute float aRandom;
        attribute float aRandomSpeed;

        varying float vRandom;

        void main()
        {
            vRandom = aRandom;
            /**
             * Position
             */
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            
            modelPosition.x += aRandomSpeed * cos(aRandom) * uTranslation ;
            modelPosition.y -= aRandomSpeed * sin(aRandom )  * uTranslation ;
            
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectedPosition = projectionMatrix * viewPosition;
            gl_Position = projectedPosition;

            
            /**
             * Size
             */
            gl_PointSize = 100.0;
            
        }
    `,
        fragmentShader: `
    #define PI 3.1415926535897932384626433832795
    uniform sampler2D uTexture;
    varying float vRandom;
    
    mat2 rotate2d(float _angle){
        return mat2(cos(_angle),-sin(_angle),
                    sin(_angle),cos(_angle));
    }
            void main()
            {
                vec2 newCoords = gl_PointCoord;
                newCoords -= vec2(0.5);
                newCoords = rotate2d(vRandom) * newCoords;
                newCoords += vec2(0.5);
                    
                vec4 color = texture2D(uTexture, newCoords) * vec4(0.8, 0.2, 0.0, 1.0) * 2.0;
                gl_FragColor = color;
            }
        `
    })

    gsap.fromTo(material.uniforms.uTranslation, { value: 0 }, { repeatDelay: 0, duration: 2.5, value: 2, repeat: -1
        , ease: "none" })

    return (
        <points
            geometry={geometry}
            material={material}
        />
    );
};

export default Sparks;