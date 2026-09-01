console.log("Main 컴포넌트 렌더링");

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from "react-router-dom";

//bootstrap (JS는 불러오지 않음)
import "bootstrap/dist/css/bootstrap.min.css";
import "bootswatch/dist/flatly/bootstrap.min.css"

import App from './App.jsx'
import './index.css'

/*
  React Router v6의 라우팅 방식 종류 및 특징
  
  <BrowserRouter>
  - 일반적인 주소 패턴으로 컴포넌트를 연결
  - 컴포넌트별로 독립적인 주소를 가짐
  - [장점] 사용자가 봤을 때 거부감이 없음
  - [단점] 서버랑 합쳐질 경우 서버 측 설정이 필요함
      (ex) Spring Boot에 React를 합치게 되면 React에서만 설정해서는 접속이 안됨
      (ex) AWS Tomcat 서버와 합치게 되면 React에서만 설정해서는 접속이 안됨

  <HashRouter>
  - 아이디 표시인 해시(#)을 이용하여 컴포넌트를 연결
  - 컴포넌트가 달라도 동일한 주소를 가짐
  - [장점] 별도의 설정 없이 페이지 구분이 가능
  - [단점] 사용자가 봤을때 거부감이 있음 (피싱사이트인가?)

*/

//jotai에서 제공하는 개발도구(jotai-devtools)를 적용하기 위한 코드
import { DevTools } from "jotai-devtools";
import "jotai-devtools/styles.css";
import { Provider } from "jotai";
import WebSocketProvider from "./websocket/WebSocketProvider.jsx";

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <BrowserRouter>
    {/* jotai 적용 범위 설정 */}
    <Provider>
      <WebSocketProvider>

      {/* 개발 모드일 때만 표시되도록 조건 설정 */}
      { import.meta.env.DEV && (
        <DevTools position="bottom-right"/>
      )}
      <App />
      </WebSocketProvider>

    </Provider>
  </BrowserRouter>
  // </StrictMode>,
)