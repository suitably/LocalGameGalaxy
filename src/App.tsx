import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { Hub } from './features/hub/Hub';
import { WerewolfGame } from './games/werewolf/WerewolfGame';
import { ImposterGame } from './games/imposter/ImposterGame';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Hub />} />
        <Route path="games/werewolf" element={<WerewolfGame />} />
        <Route path="games/imposter" element={<ImposterGame />} />
      </Route>
    </Routes>
  );
}

export default App;
