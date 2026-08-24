import { useEffect } from "react"
import { getWebSocketClient } from "@utils/websocket";

export default function Chat() {

    //써둔거 공용 웹소켓 서버 테스트 코드입니다
    useEffect(() => {
        const client = getWebSocketClient();

        if (client === null || client.connected == false) {
            return;
        }

        const subscription = client.subscribe(
            "/public/test",
            message => {
                console.log("WebSocket 수신 : ", message.body);
            }
        );

        return () => {
            //서버를 deactivate하는게 아니라 chat 구독만 해제
            subscription.unsubscribe();
        }

    }, []);

    const sendTest = () => {

    const client = getWebSocketClient();

    if (client === null || client.connected === false) {
        return;
    }

    client.publish({
        destination: "/app/test",
        body: "테스트 메시지",
    });
};
    return(<>
        <h1>Chat</h1>

        <button type="button" onClick={sendTest}>
            WebSocket 테스트
        </button>
    </>)
}