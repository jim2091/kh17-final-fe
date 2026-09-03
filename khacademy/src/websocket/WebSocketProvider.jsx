import { useAtomValue } from "jotai";
import { useContext, useEffect, useState, createContext } from "react";
import { isLoginState } from "@utils/storage";
import { connectWebSocket, getWebSocketClient, onWebSocketConnect, disconnectWebSocket
} from "@utils/websocket";

const WebSocketContext = createContext(null);

export default function ({ children }) {

    const isLogin = useAtomValue(isLoginState);
    const [users, setUsers] = useState([]);

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

    //백엔드에서 온라인 사용자 변동을 실시간으로 전달받는 구독
    useEffect(()=>{
        if(!isLogin){//로그인 상태가 아니면
            setUsers([]);//사용자들을 보여주지 않겠다
            return;
        }

        let subscription = null;
        
        onWebSocketConnect(() => {//웹소켓 서버와 연결이 되면 이 콜백함수를 실행하겠다
            //공용 웹소켓 클라이언트를 가져오고
            const client = getWebSocketClient();
            //없으면 때려치고
            if(client == null) return;

            subscription = client.subscribe(
                "/public/onlineUsers",//여기 구독해서
                (message) => {
                    const json = JSON.parse(message.body);
                    setUsers(json);
                }
            );

            //현재 온라인 사용자 목록 요청
            client.publish({
                destination: "/app/onlineUsers"
            });

        });

        //클린업 함수
        return () => {
            subscription?.unsubscribe();
            setUsers([]);
        }

    }, [isLogin]);

    //아까 publish도 언뜻 봤던거 같은데 지금은 백엔드에 따로 구현 안돼있는거 같아서 그냥 둘게요

    return (<>
        <WebSocketContext.Provider value={{ users }}>
            {children}
        </WebSocketContext.Provider>
    </>);
}

//커스텀 훅
// 다른 하위 컴포넌트에서 const{ users } = useWebSocket();
// 이렇게 하면 아까 구독을 통해 받은 사용자 목록을 받아서 쓸 수 있음
export const useWebSocket = () => {
    return useContext(WebSocketContext);
};