import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs"

//서버와의 websocket 연결정보를 가진 공통 객체
let client = null;

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

        onConnect: () => {
            console.log("WebSocket 연결 성공");
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