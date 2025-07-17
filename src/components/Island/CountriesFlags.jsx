import { CountryFlag } from "./CountryFlag";

const CountriesFlags = (props) => {
  const { island } = props;

  return (
    <>
      <CountryFlag
        flag={island.scene.children[0].children[0].children[16]}
        offset={0.345}
      />
      <CountryFlag
        flag={island.scene.children[0].children[0].children[17]}
        offset={0.265}
      />
      <CountryFlag
        flag={island.scene.children[0].children[0].children[18]}
        offset={0.26}
      />
    </>
  );
};

export { CountriesFlags };
