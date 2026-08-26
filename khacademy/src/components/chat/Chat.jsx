import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom";
import { getWebSocketClient } from "@utils/websocket";
import { apiClient } from "../../utils/reaxios";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAtomValue } from "jotai";
import { loginUserState } from "@utils/storage";

import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import MessageArea from "./MessageArea";
import MessageInput from "./MessageInput";

import "./Chat.css";

export default function Chat() {
    //● state
    const {projectNo} = useParams(); 
    const [channels, setChannels] = useState([]);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [client, setClient] = useState(null);
    const loginUser = useAtomValue(loginUserState);

    //● 채널 목록
    const loadChannelList = useCallback(async () => {
        try {
            const { data } = await apiClient.get(
                `/channel/project/${projectNo}`
            );
            setChannels(data);
        }
        catch(e) {
            console.error(e);
        }
    }, [projectNo]);

    useEffect(() => {
        loadChannelList();
    }, []);


    //● 채널 선택
    useEffect(() => {
        //- 첫 번째 채널(#general) 기본 선택
        if(channels.length > 0 && selectedChannel === null) {
            setSelectedChannel(channels[0]);
        }
    }, [channels, selectedChannel]);


    //● 메세지 내역
    const loadMessages = useCallback(async (channelNo) => {
        try {
            const { data } = await apiClient.post(
                `/channel/${channelNo}/messages`,
                { size : 100 , lastMessageNo : null }
            );
            //console.log("과거 메세지 : ", data);

            const messages = data.messages.map(message => ({
                ...message,
                time: message.ctime
            }));

            setMessages(messages);
        }
        catch(e) {
            console.error("메세지 조회 실패 : ", e);
        }
    }, []);

    useEffect(() => {
        if (!selectedChannel) return;

        loadMessages(selectedChannel.chatChannelNo);
    }, [selectedChannel, loadMessages]);


    //● 메세지 전송
    const sendMessage = useCallback(() => {

        //(1) 메세지를 전송할 수 있는 상태인지 검증
        if (!selectedChannel) return;//채널을 선택하지 않았으면 전송하지 않음
        if(input.trim() === "") return;//입력값이 비어있으면 전송하지 않음
        if (!client) return;//WebSocket 연결이 안됐으면 전송하지 않음

        //(2) 메세지 전송을 위한 JSON 데이터 생성
        const json = { content : input };

        client.publish({
            destination: `/app/${selectedChannel.chatChannelNo}/chat`,
            body: JSON.stringify(json)
        });

        //(3) 메세지 입력창 비우기
        setInput("");

    }, [client, input, selectedChannel]);


    //● WebSocket 연결
    useEffect(() => {
        if (!selectedChannel) return;

        //(1) 연결(socket) 생성
        const socket = new SockJS(
            `${import.meta.env.VITE_SERVER_URL}/ws`
        );

        //(2) 연결을 관리할 도구(client) 생성하여 반환
        const stompClient = new Client({
            //- 연결 객체를 생성하는 함수
            webSocketFactory: () => socket,

            onConnect: () => {
                console.log(
                    "WebSocket 연결 성공!",
                    selectedChannel.chatChannelNo
                );

                stompClient.subscribe(
                    `/public/${selectedChannel.chatChannelNo}/chat`,
                    (message) => {
                        const json = JSON.parse(message.body);
                        console.log("실시간 메시지:", json);
                        setMessages(prev => [
                            ...prev,
                            json
                        ]);
                    }
                );
            },
            //- 디버깅 설정(옵션)
            debug: (str) => console.log(str)
        });

        //(3) 클라이언트 활성화
        stompClient.activate();
        setClient(stompClient);

        return () => {
            stompClient.deactivate();
            setClient(null);
        };
    }, [selectedChannel]);

    //● view
    return(<>
        <div className="chat-page">

            <ChatSidebar 
                channels={channels} 
                onSelectedChannel={setSelectedChannel}
            />

            <div className="chat-main">
                <ChatHeader 
                    selectedChannel={selectedChannel}
                />

                <MessageArea 
                    messages={messages}
                />

                <MessageInput 
                    input={input}
                    setInput={setInput}
                    onSend={sendMessage}
                />

            </div>
        </div>
    </>)
}