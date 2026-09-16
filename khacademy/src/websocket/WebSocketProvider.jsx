import { useAtomValue } from "jotai";
import { useContext, useEffect, useState, createContext } from "react";
import { isLoginState } from "@utils/storage";
import { connectWebSocket, getWebSocketClient, disconnectWebSocket,
    onWebSocketDisconnect, onWebSocketReconnect
} from "@utils/websocket";

const WebSocketContext = createContext(null);

export default function ({ children }) {

    const isLogin = useAtomValue(isLoginState);
    const [presenceMap, setPresenceMap] = useState({});
    const [presenceReady, setPresenceReady] = useState(false);

    //웹소켓 연결을 관리하는 useEffect
    useEffect(() => {
        if (!isLogin) {
            return;
        }
        //로그인 상태이면 웹소켓 서버에 연결
        connectWebSocket();

        return () => {
            //로그아웃 시
            disconnectWebSocket();
        };

    }, [isLogin]);

    //Presence 상태 변화를 실시간으로 전달받는 구독
    useEffect(() => {
        if(!isLogin) {
            setPresenceMap({});
            setPresenceReady(false)
            return;
        }

        let subscription = null;

        //Presence 구독
        const subscribePresence = () => {
            const client = getWebSocketClient();

            if (client === null || client.connected === false) return;

            //혹시 기존 구독이 남아있다면 제거
            try {
                subscription?.unsubscribe();
            }
            catch(e){
                //이미 끊어진 연결의 구독이면 무시
            }

            subscription = client.subscribe(
                "/public/presence",
                (message) => {

                    const json = JSON.parse(message.body);

                    //일단 테스트용
                    console.log(
                        "Presence 수신 : ",
                        json
                    );

                    setPresenceMap(prev => ({
                        ...prev,
                        [json.empNo]: json.status
                    }));
                }
            );

            console.log("Presence 구독 완료");

            setPresenceReady(true);
        };

        //최초 연결 및 재연결마다 Presence를 다시 구독
        const unregisterReconnect = onWebSocketReconnect(subscribePresence);

        //WebSocket 연결이 끊어지면
        const unregisterDisconnect = 
            onWebSocketDisconnect(() => {
                console.log("Presence 연결 대기 상태");

                //기존 subscription은 끊어진 연결의 것이므로 버림
                subscription = null;

                //이전에 WebSocket으로 받은 값도 초기화
                setPresenceMap({});
                setPresenceReady(false);
            });

        //컴포넌트 정리
        return () => {
            unregisterReconnect();
            unregisterDisconnect();

            try {
                subscription?.unsubscribe();
            }
            catch(e) {
                //이미 연결이 종료된 경우 무시
            }

            subscription = null;
            setPresenceMap({});
            setPresenceReady(false);

        };
    }, [isLogin]);


    return (<>
        <WebSocketContext.Provider value={{ presenceMap, presenceReady }}>
            {children}
        </WebSocketContext.Provider>
    </>);
}

//커스텀 훅
// 다른 하위 컴포넌트에서 const{ presenceMap } = useWebSocket();
// 이렇게 하면 아까 구독을 통해 받은 사용자 목록을 받아서 쓸 수 있음
export const useWebSocket = () => {
    return useContext(WebSocketContext);
};