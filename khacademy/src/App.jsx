import { useState } from 'react'
import './App.css'
import { Navigate, Route, Routes } from "react-router-dom"
import MainLayout from "./templates/MainLayout";
import MyProjectList from "./components/project/MyProjectList";
import ProjectAdd from "./components/project/ProjectAdd";
import ProjectEdit from "./components/project/ProjectEdit";
import PublicProjectList from './components/project/PublicProjectList';
import ArcheiveProjectList from './components/project/ArchiveProjectList';
import ProjectLayout from './templates/ProjectLayout';
import Chat from './components/chat/Chat';
import Task from './components/task/Task';
import TaskInsert from './components/task/TaskInsert';
import Calendar from './components/calendar/Calendar';
import Notes from './components/notes/Notes';
import Files from './components/files/Files';
import Records from './components/records/Records';

import Search from "./components/search/Search";

import Invite from './components/member/admin/Invite';
import Mypage from "./components/member/Mypage";
import Edit from "./components/member/Edit";
import Login from "./components/member/Login";
import Users from "./components/member/admin/Users";
import AdminTabs from "./templates/AdminTabs";
import Positions from "./components/member/admin/Positions";
import Departments from "./components/member/admin/Departments";

import Private from "./guard/Private";
import Admin from "./guard/Admin";

import { useEffect } from 'react';
import { connectWebSocket, disconnectWebSocket } from './utils/websocket';
import NotFound from "./error/NotFound";
import EmpInactive from "./error/EmpInactive";


function App() {

  // 여기서 하던걸 이제 WebSocketProvider로 이전
  //공용 소켓 연결 테스트 코드.
  // useEffect(() => {
  //   connectWebSocket();
  //   return () => {
  //     disconnectWebSocket();
  //   }
  // }, []);

  return (
    <Routes>


      {/* 로그인 후 공통 화면 */}
      <Route element={<MainLayout />}>

        {/* 임시 메인 화면 */}
        <Route path="/" element={<div>메인화면입니다</div>} />
        {/* 통합 검색 */}
        <Route path="/search" element={<Search />} />
        {/* 내 프로젝트 목록 */}
        <Route path="/projects/my" element={<MyProjectList />} />
        {/* 새 프로젝트 등록 */}
        <Route path="/projects/add" element={<ProjectAdd />} />
        {/* 프로젝트 수정 */}
        <Route path="/projects/:projectNo/edit" element={<ProjectEdit />} />
        <Route path="/projects/public" element={<PublicProjectList />} />
        <Route path="/projects/archive" element={<ArcheiveProjectList />} />

        {/* 로그인 화면 */}
        <Route path="/login" element={<Login/>} />
        {/* 내 정보 페이지 */}
        <Route path="/me" element={<Private><Mypage/></Private>} />
        {/* 내 정보 수정 페이지 */}
        <Route path="/edit" element={<Private><Edit/></Private>} />
      <Route element={<AdminTabs />}>
        
        {/* 초대하기 화면 */}
        <Route path="invite" element={<Admin><Invite/></Admin>} />

        {/* 사용자 관리(관리자) */}
        <Route path="users" element={<Admin><Users/></Admin>} />
        {/* 부서관리(관리자) */}
        <Route path="departments" element={<Admin><Departments/></Admin>} />
        {/* 직급관리(관리자) */}
        <Route path="positions" element={<Admin><Positions/></Admin>} />
    </Route>
        {/* 프로젝트 내부 */}
        <Route path="/projects/:projectNo" element={<ProjectLayout />}>
          <Route index element={<Navigate to="task" replace />} />

          <Route path="task" element={<Task />} />
          <Route path="taskInsert" element={<TaskInsert />} />

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