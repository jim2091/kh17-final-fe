import { useAtomValue } from "jotai";
import { useContext, useEffect, useState, createContext } from "react";
import { isLoginState } from "@utils/storage";
import { connectWebSocket, getWebSocketClient, onWebSocketConnect
} from "@utils/websocket";

const WebSocketContext = createContext(null);

export default function ({ children }) {

    const isLogin = useAtomValue(isLoginState);
    const [users, setUsers] = useState([]);

    const connectToServer = useCallback(() => {

        const socket = new SockJS(`${import.meta.env.VITE_SERVER_URL}/ws`);

        const client = new Client({
            webSocketFactory: () => socket,

            onConnect: () => {
                client.subscribe("/public/onlineUsers", (message) => {
                    const jsonArray = JSON.parse(message.body);
                    setUsers(jsonArray);
                });

                client.publish({
                    destination: "/app/onlineUsers"
                });
            },

            debug: (str) => console.log(str)
        });

        //클린업 함수
        return () => {
            subscription?.unsubscribe();
            setUsers([]);
        }
    }, []);

    
    useEffect(() => {


    if (!isLogin) {
        return;
    }

    const client = connectToServer();

    setClient(client);


    return () => {

        disconnectFromServer(client);
        setClient(null);
    };

}, [isLogin]);






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