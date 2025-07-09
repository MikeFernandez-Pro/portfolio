import { useControls } from "leva";

const isDebug = window.location.hash === "#debug";

const LanternsAndHome = (props) => {
  const { island } = props;

  if (isDebug) {
    useControls("Lanterns", {
      color: {
        value: "#f28b8b",
        onChange: (value) => {
          island.materials.lanternsAndHomes.color.set(value);
        },
      },
      emissiveIntensity: {
        value: 5.2,
        min: 0,
        max: 10,
        step: 0.01,
        onChange: (value) => {
          island.materials.lanternsAndHomes.emissiveIntensity = value;
        },
      },
    });
  }

  return null;
};

export { LanternsAndHome };
