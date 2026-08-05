import { CountryFlag } from './CountryFlag';

const CountriesFlags = props => {
  const { island } = props;

  return (
    <>
      <CountryFlag
        node={island.nodes.island_17}
        baseMaterial={island.materials.britishFlag}
      />
      <CountryFlag
        node={island.nodes.island_18}
        baseMaterial={island.materials.frenchFlag}
      />
      <CountryFlag
        node={island.nodes.island_19}
        baseMaterial={island.materials.spainFlag}
      />
    </>
  );
};

export { CountriesFlags };
