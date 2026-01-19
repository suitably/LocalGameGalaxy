import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { Hub } from './features/hub/Hub';
import { WerewolfGame } from './games/werewolf/WerewolfGame';
import { ImposterGame } from './games/imposter/ImposterGame';
import { MelodiqGame } from './games/melodiq/MelodiqGame';
import { MelodiqPhoneClient } from './games/melodiq/MelodiqPhoneClient';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Hub />} />
        <Route path="games/werewolf" element={<WerewolfGame />} />
        <Route path="games/imposter" element={<ImposterGame />} />
        <Route path="games/melodiq" element={<MelodiqGame />} />
        <Route path="games/melodiq/phone" element={<MelodiqPhoneClient />} />
      </Route>
    </Routes>
  );
}

export default App;
