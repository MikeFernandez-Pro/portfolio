import { useMemo } from 'react';

import { CountryFlag } from './CountryFlag';

const CountriesFlags = props => {
  const { island } = props;

  const flags = useMemo(() => {
    return {
      england: island.scene.children[0].children[0].children[16],
      spain: island.scene.children[0].children[0].children[17],
      france: island.scene.children[0].children[0].children[18],
    };
  }, [island]);

  return (
    <>
      <CountryFlag flag={flags.england} offset={0.345} />
      <CountryFlag flag={flags.spain} offset={0.265} />
      <CountryFlag flag={flags.france} offset={0.26} />
    </>
  );
};

export { CountriesFlags };
