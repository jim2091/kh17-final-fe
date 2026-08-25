import { useState } from 'react'
import './App.css'
import { Navigate, Route, Routes } from "react-router-dom"
import MainLayout from "./templates/MainLayout";
import ProjectList from './components/project/ProjectList';
import ProjectAdd from "./components/project/projectAdd";
import PublicProjectList from './components/project/PublicProjectList';
import ArcheiveProjectList from './components/project/ArchiveProjectList';
import ProjectLayout from './templates/ProjectLayout';
import Task from './components/task/Task';
import Chat from './components/chat/Chat';
import Calendar from './components/calendar/Calendar';
import Notes from './components/notes/Notes';
import Files from './components/files/Files';
import Records from './components/records/Records';
import Login from './components/member/Login';
import Invite from './components/member/admin/Invite';
import Mypage from "./components/member/Mypage";
import { useEffect } from 'react';
import { connectWebSocket, disconnectWebSocket } from './utils/websocket';
import NotFound from "./error/NotFound";
import EmpInactive from "./error/EmpInactive";

function App() {

  //공용 소켓 연결 테스트 코드.
  useEffect(() => {
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    }
  }, []);

  return (
    <Routes>


      {/* 로그인 후 공통 화면 */}
      <Route element={<MainLayout />}>

        {/* 임시 메인 화면 */}
        <Route path="/" element={<div>메인화면입니다</div>} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/add" element={<ProjectAdd />} />
        <Route path="/projects/public" element={<PublicProjectList />} />
        <Route path="/projects/archive" element={<ArcheiveProjectList />} />

        {/* 로그인 화면 */}
        <Route path="/login" element={<Login/>} />
        {/* 내 정보 페이지 */}
        <Route path="/me" element={<Mypage/>} />
        {/* 초대하기 화면 */}
        <Route path="/invite" element={<Invite/>} />

        {/* 프로젝트 내부 */}
        <Route path="/projects/:projectNo" element={<ProjectLayout />}>
          <Route index element={<Navigate to="task" replace />} />

          <Route path="task" element={<Task />} />

          <Route path="chat" element={<Chat />} />

          <Route path="calendar" element={<Calendar />} />

          <Route path="notes" element={<Notes />} />

          <Route path="files" element={<Files />} />

          <Route path="records" element={<Records />} />

        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
      <Route path="/emp/inactive" element={<EmpInactive />} />
    </Routes>
  )
}

export default App