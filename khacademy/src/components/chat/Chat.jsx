import { useCallback, useEffect, useMemo, useState } from "react"
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
    const [last, setLast] = useState(true);//과거 메세지가 더 있는지 여부(true/false)
    const [sidebarOpen, setSidebarOpen] = useState(false);


    //● 채널 목록 불러오기
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


    //● 처음 메세지 조회
    const loadMessages = useCallback(async (channelNo) => {
        try {
            const { data } = await apiClient.post(
                `/channel/${channelNo}/messages`,
                { 
                    size : 100 , 
                    lastMessageNo : null 
                }
            );
            //console.log("과거 메세지 : ", data);

            const messages = data.messages.map(message => ({
                ...message,
                time: message.ctime
            }));
            
            setMessages(messages);
            setLast(data.last);
        }
        catch(e) {
            console.error("메세지 조회 실패 : ", e);
        }
    }, []);


    //● 채널 변경시 처음 메세지 조회
    useEffect(() => {
        if (!selectedChannel) return;

        loadMessages(selectedChannel.chatChannelNo);
    }, [selectedChannel, loadMessages]);


    //● 현재 화면에서 가장 오래된 메세지 번호
    const oldestMessageNo = useMemo(() => {
        if(!messages || messages.length === 0) {
            return null;
        }
        return messages[0].no;
    }, [messages]);


    //● 더보기 과거 메세지 100개 가져오기
    const loadMoreMessages = useCallback(async() => {
        if(!selectedChannel) return;//채널을 선택하지 않았으면 종료
        if(last === true) return;//과거 메세지가 더 이상 없으면 종료
        if(oldestMessageNo === 0) return;//아직 메세지가 없다면 종료

        try {
            const { data } = await apiClient.post(
                `/channel/${selectedChannel.chatChannelNo}/messages`,
                { 
                    size : 100 , 
                    lastMessageNo : oldestMessageNo 
                }
            );

            const newMessages  = data.messages.map(message => ({
                ...message,
                time: message.ctime
            }));
            
            //- 기존 메세지 앞에 과거 메세지 추가
            setMessages(prev => [
                ...newMessages,
                ...prev
            ]);
            setLast(data.last);
        }
        catch(e) {
            console.error("메세지 조회 실패 : ", e);
        }
    }, [selectedChannel, last, oldestMessageNo]);


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


    //● 메세지 삭제 
    const handelDelete = async(message) => {
        try {
            await apiClient.delete(`/message/${message.no}`);

            //- 삭제 후 메세지 목록 다시 불러오기
            loadMessages(selectedChannel.chatChannelNo);
        }
        catch(e) {
            console.error("메시지 삭제 실패", e);
        }
    };


    //● 메세지 수정
    const handelEdit = async(message) => {
        const content = window.prompt(
            "메시지를 수정하세요.",
            message.content
        );

        // 취소
        if(content === null) {
            return;
        }

        // 빈 문자열 방지
        if(content.trim() === "") {
            return;
        }

        try {

            await apiClient.put(`/message/${message.no}`, {
                content: content
            });

            //- 수정 후 다시 조회
            loadMessages(selectedChannel.chatChannelNo);

        }
        catch(e) {
            console.error("메시지 수정 실패", e);
        }
    };


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
                selectedChannel={selectedChannel}
                setSelectedChannel={setSelectedChannel}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />

            <div className="chat-main">
                <ChatHeader 
                    selectedChannel={selectedChannel}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />

                <MessageArea 
                    messages={messages}
                    onLoadMore={loadMoreMessages}
                    onEdit={handelEdit}
                    onDelete={handelDelete}
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