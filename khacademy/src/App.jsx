import { useState } from 'react'
import './App.css'
import { Route, Routes } from "react-router-dom"
import MainLayout from "./templates/MainLayout";

function App() {

  return (
    <Routes>

      {/* 로그인 후 공통 화면 */}
      <Route element={<MainLayout />}>

        {/* 임시 메인 화면 */}
        <Route 
          path="/"
          element={<div>메인화면입니다</div>}
        />
      </Route>
    </Routes>
  )
}

export default App