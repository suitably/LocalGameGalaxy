import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { Hub } from './features/hub/Hub';
import { WerewolfGame } from './games/werewolf/WerewolfGame';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Hub />} />
        <Route path="games/werewolf" element={<WerewolfGame />} />
      </Route>
    </Routes>
  );
}

export default App;
