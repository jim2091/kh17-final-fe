import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs"

//서버와의 websocket 연결정보를 가진 공통 객체
let client = null;

//WebSocket 연결 완료를 한 번 기다리는 작업 목록
const connectCallbacks = [];

//최초 연결 + 재연결때마다 실행할 작업 목록
const reconnectCallbacks = new Set();

//연결이 끊겼을 때 실행할 작업 목록
const disconnectCallbacks = new Set();

//WebSocket 서버 연결
export const connectWebSocket = () => {

    //이미 연결된 Client가 존재하면 새로 만들지 않음
    if(client != null && client.active === true) {
        return client;
    }

    //이젠 재연결 할때마다 새로운 SockJS 객체 생성할거임
    // //SockJS 연결 객체 생성
    // const socket = new SockJS(
    //     `${import.meta.env.VITE_SERVER_URL}/ws`
    // );

    //STOMP Client 생성
    client = new Client({
        //재연결할 때마다 새로운 SockJS 객체 생성
        webSocketFactory: () => 
            new SockJS(`${import.meta.env.VITE_SERVER_URL}/ws`),

        //연결이 끊어진 경우 3초 후 재연결
        reconnectDelay: 3000,

        onConnect: () => {//웹소켓 연결이 완료되면
            console.log("WebSocket 연결 성공");

            //연결되기를 한 번 기다리던 작업들을 전부 실행
            const waitingCallbacks = [...connectCallbacks];

            connectCallbacks.length = 0;

            waitingCallbacks.forEach(callback => callback());

            //최초 연결 후 재연결마다 실행해야 하는 작업 실행
            reconnectCallbacks.forEach(callback => callback());
        },

        onWebSocketClose: () => {
            console.log("WebSocket 연결 종료");
            
            disconnectCallbacks.forEach(callback => callback());
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

    const currentClient = client;

    client = null;

    currentClient.deactivate();

    //아직 연결을 기다리고 있던 1회성 작업은 제거
    connectCallbacks.length = 0;
};

//현재 WebSocket Client 반환
export const getWebSocketClient = () => {
    return client;
};

//현재 연결되었거나 연결이 완료되면 한 번 실행할 작업
export const onWebSocketConnect = (callback) => {

    if(typeof callback !== "function") {
        return;
    }

    //이미 연결 완료
    if(client !== null && client.connected === true) {
        callback();
        return;
    }
    
    //아직 연결중이면
    connectCallbacks.push(callback);//콜백 함수를 대기 목록에 저장해라
};

//최초 연결 + 이후 재연결마다 실행할 작업 등록
export const onWebSocketReconnect = (callback) => {
    if(typeof callback !== "function") {
        return () => {};
    }

    reconnectCallbacks.add(callback);

    //이미 연결된 상태에서 등록했다면 지금 즉시 한 번 실행
    if(client !== null && client.connected === true){
        callback();
    }

    //등록 해제 함수 반환
    return() => {
        reconnectCallbacks.delete(callback);
    };
};

//웹소켓 연결 종료 감지
export const onWebSocketDisconnect = (callback) => {
    if(typeof callback !== "function") {
        return () => {};
    }

    disconnectCallbacks.add(callback);

    //등록 해제 함수 반환
    return() => {
        disconnectCallbacks.delete(callback);
    };
};