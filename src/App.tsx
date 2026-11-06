import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ScrollPage from './pages/ScrollPage'
import Repertoire from './pages/Repertoire'
import Schools from './pages/Schools'
import News from './pages/News'
import Profile from './pages/Profile'
import Search from './pages/Search'
import AIEnter from './pages/AIEnter'
import StageAndBackstage from './pages/StageAndBackstage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="scroll" element={<ScrollPage />} />
        <Route path="repertoire" element={<Repertoire />} />
        <Route path="schools" element={<Schools />} />
        <Route path="news" element={<News />} />
        <Route path="backstage" element={<StageAndBackstage />} />
        <Route path="ai" element={<AIEnter />} />
        <Route path="search" element={<Search />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}

export default App
