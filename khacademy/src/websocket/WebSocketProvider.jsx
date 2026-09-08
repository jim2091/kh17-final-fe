import { useAtomValue } from "jotai";
import { useContext, useEffect, useState, createContext } from "react";
import { isLoginState } from "@utils/storage";
import { connectWebSocket, getWebSocketClient, onWebSocketConnect, disconnectWebSocket
} from "@utils/websocket";

const WebSocketContext = createContext(null);

export default function ({ children }) {

    const isLogin = useAtomValue(isLoginState);
    const [presenceMap, setPresenceMap] = useState({});

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
            return;
        }

        let subscription = null;

        onWebSocketConnect(() => {
            const client = getWebSocketClient();

            if(client == null) return;

            subscription = client.subscribe(
                "/public/presence",
                (message) => {

                    const json = JSON.parse(message.body);

                    setPresenceMap(prev => ({
                        ...prev,
                        [json.empNo]: json.status
                    }));
                }
            );

        });

        return () => {
            subscription?.unsubscribe();
            setPresenceMap({});
        }
    }, [isLogin]);


    return (<>
        <WebSocketContext.Provider value={{ presenceMap }}>
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