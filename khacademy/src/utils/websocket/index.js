import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs"

//서버와의 websocket 연결정보를 가진 공통 객체
let client = null;

//WebSocket 연결 완료를 기다리는 작업 목록
const connectCallbacks = [];

//SebSocket 서버 연결
export const connectWebSocket = () => {

    //이미 연결된 Client가 존재하면 새로 만들지 않음
    if(client != null && client.active === true) {
        return client;
    }

    //SockJS 연결 객체 생성
    const socket = new SockJS(
        `${import.meta.env.VITE_SERVER_URL}/ws`
    );

    //STOMP Client 생성
    client = new Client({
        webSocketFactory: () => socket,

        onConnect: () => {//웹소켓 연결이 완료되면
            console.log("WebSocket 연결 성공");
            //연결되기를 기다리던 작업들을 전부 실행
            connectCallbacks.forEach(callback => callback());
            //작업 목록 비우기
            connectCallbacks.length = 0;
        },

        onStompError: (frame) => {
            console.log("WebSocket STOMP 오류", frame);
        },

        onWebSocketError: (error) => {
            console.log("WebSocket 연결 오류", error);
        },

        debug: (str) => {
            console.log(str);
        },
    });

    //Client 활성화
    client.activate();

    return client;

}

//WebSocket 연결 종료
export const disconnectWebSocket = () => {

    if (client === null) return;

    client.deactivate();
    client = null;
};

//현재 WebSocket Client 반환
export const getWebSocketClient = () => {
    return client;
};

//강의때는 각 채팅방 접속시 클라이언트를 만들고 해당 클라이언트 안에서
//onConnect: () => {}이런 형태로 연결되었을때의 콜백함수 내에서 채널 구독 등을 처리해서
//아래 기능이 필요 없었음
//이제는 공용 클라이언트 하나의 onConnect를 여러 화면이 공유해야 하기 때문에
//작업 목록에 각 화면에서 실제로 연결이 됐을때 실행되야 하는 콜백함수를 저장해두고
//연결이 되면 실행하는 형태로 구현
export const onWebSocketConnect = (callback) => {

    if(client === null) return;

    if(client.connected === true) {//연결 됐으면
        callback();//받은 콜백 함수를 실행해라
    }
    else {//아직 연결중이면
        connectCallbacks.push(callback);//콜백 함수를 대기 목록에 저장해라
    }
}