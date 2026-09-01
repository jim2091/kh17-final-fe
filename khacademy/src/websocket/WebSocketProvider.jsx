import { useAtomValue } from "jotai";
import { useCallback, useContext, useEffect, useState, createContext } from "react";
import { isLoginState } from "@utils/storage";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const WebSocketContext = createContext(null);

//현재 구독중인 사용자의 리스트를 알아내보자
export default function ({ children }) {

    //홈페이지에 들어오자마자 실행??? or 홈페이지에 들어왔고 로그인 하면 실행 ??? 
    //후자..
    //그럼 로그인 상태를 불러와야 겠네 
    // useEffect(()=>{

    // }, []);


    const isLogin = useAtomValue(isLoginState);

    const [client, setClient] = useState(null);

    const [users, setUsers] = useState([]);



    console.log("로그인 중인 사용자 목록  : ", users);





    const connectToServer = useCallback(() => {

        const socket = new SockJS(`${import.meta.env.VITE_SERVER_URL}/ws`);

        const client = new Client({
            webSocketFactory: () => socket,

            onConnect: () => {
                client.subscribe("/public/onlineUsers", (message) => {
                    const jsonArray = JSON.parse(message.body);
                    setUsers(jsonArray);
                    console.log("구독명단 : ", jsonArray);
                });

                client.publish({
                    destination: "/app/onlineUsers"
                });
            },

            debug: (str) => console.log(str)
        });

        client.activate();

        return client;
    }, []);

    const disconnectFromServer = useCallback((client) => {
        if (client) {
            client.deactivate();
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
        }

    }, [isLogin, connectToServer]);





    return (<>
        <WebSocketContext.Provider value={{ users }}>
            {/* {console.log("Context에 전달하는 users:", users)} */}
            {children}
        </WebSocketContext.Provider>
    </>);
}

export const useWebSocket = () => {
    return useContext(WebSocketContext);
};