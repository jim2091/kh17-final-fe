import { useEffect } from "react"
import { getWebSocketClient } from "@utils/websocket";

export default function Chat() {

    //WebSocket 채널 메시지 테스트
    useEffect(() => {
        console.log("Chat useEffect 실행");
        
        const client = getWebSocketClient();

        if (client === null || client.connected == false) {
            console.log("WebSocket이 연결되지 않았습니다.");
            return;
        }

        //채널 2의 메세지 구독
        const subscription = client.subscribe(
            "/public/2/chat",
            message => {
                console.log("===== WebSocket 수신 =====");
                console.log("WebSocket 수신 : ", message.body);
            }
        );

        console.log("채널 2 구독 완료");

        return () => {
            //서버를 deactivate하는게 아니라 chat 구독만 해제
            subscription.unsubscribe();
        }

    }, []);

    //채널 2에 메세지 전송
    const sendTest = () => {
        const client = getWebSocketClient();

        if (client === null || client.connected === false) {
            console.log("WebSocket이 연결되지 않았습니다.");
            return;
        }

        client.publish({
            destination: "/app/2/chat",
            body: JSON.stringify({
                content: "웹소켓 테스트 메시지입니다!"
            })
        });
        console.log("WebSocket 전송 완료");
    };

    return(<>
        <h1>Chat</h1>

        <button type="button" onClick={sendTest}>
            WebSocket 테스트
        </button>
    </>)
}