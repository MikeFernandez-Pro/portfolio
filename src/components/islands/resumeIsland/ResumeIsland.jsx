import { CountriesFlags } from './countryFlags/CountriesFlags';
import SleepText from './SleepText.jsx';

const ResumeIsland = props => {
  const { island } = props;

  return (
    <>
      <CountriesFlags island={island} />
      <SleepText />
    </>
  );
};

export { ResumeIsland };
