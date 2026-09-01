import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

//주요 경로에 대한 별칭(alias) 설정
//- 절대경로란 개념이 존재하지 않기 때문에 특정 위치를 쉽게 부를 수 있도록 별칭을 부여
//- nodejs에 있는 파일 시스템과 별칭을 연결해서 설정으로 작성해두여야 한다
//- (ex) 내가 만약 '@src'라고 하면 'src' 폴더를 말하는걸로 생각해라!
//- (ex) 내가 만약 '@components'라고 하면 'src/components' 폴더를 말하는걸로 생각해라!
import {fileURLToPath, URL} from "node:url";
const path = (value)=>fileURLToPath(new URL(value, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  //외부 접속 허용 설정
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@src": path("./src"),
      "@assets": path("./src/assets"),
      "@components": path("./src/components"),
      "@error": path("./src/error"),
      "@templates": path("./src/templates"),
      "@utils": path("./src/utils"),
      "@guard": path("./src/guard"),
      "@websocket":path("./src/websocket"),
    }
  },
  //라이브러리 구동에 필요한 값을 정의
  define : {
    global:"window",//global이라는 코드가 라이브러리에 있다면 window로 해석되도록 별칭 부여
  }
})