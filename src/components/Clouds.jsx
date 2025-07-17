import React from "react";
import { Cloud, Clouds as CloudsGroup } from "@react-three/drei";

const Clouds = (props) => {

    return (
        <CloudsGroup position-z={6.5}>
            <Cloud
                speed={0.1}
                position={[10, 13, 1]}
                opacity={0.8}
                scale={2.5}
            />
             <Cloud
                speed={0.1}
                position={[-15, 15, 3 ]}
                opacity={0.5}
                scale={2}
            />
            <Cloud
                speed={0.1}
                position={[-4, -3, 5]}
                opacity={0.3}
                scale={3}
            />
            <Cloud
                speed={0.1}
                position={[-25, 8, 10 ]}
                opacity={0.1}
                scale={2}
            />
              <Cloud
                speed={0.1}
                position={[0, 10, 15 ]}
                opacity={0.05}
                scale={3}
            />
        </CloudsGroup>
    );
};

export default React.memo(Clouds);
