import { useState } from 'react'
import Layout from './components/Layout'
import SituationInput from './components/SituationInput'
import DashboardTable from './components/DashboardTable'

function App() {
  const [activeTab, setActiveTab] = useState<'main' | 'history'>('main')

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'main' ? <SituationInput /> : <DashboardTable />}
    </Layout>
  )
}

export default App
