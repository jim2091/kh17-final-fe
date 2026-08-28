import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom";
import { getWebSocketClient } from "@utils/websocket";
import { apiClient } from "../../utils/reaxios";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAtomValue } from "jotai";
import { loginUserState } from "@utils/storage";
import Swal from "sweetalert2";

import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import MessageArea from "./MessageArea";
import MessageInput from "./MessageInput";

import "./Chat.css";

export default function Chat() {
    //● state
    const {projectNo} = useParams(); 
    const [channels, setChannels] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState([]);
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
    }, [loadChannelList]);


    //● 채널별 안 읽은 메세지 수 조회
    const loadUnreadCount = useCallback(async () => {
        try {
            const { data } = await apiClient.get(
                `/message/project/${projectNo}/unread`
            );

            //console.log("채널별 안 읽은 메세지 수 : ", data);

            const counts = {};

            data.forEach(item => {
                counts[item.channelNo] = item.unreadCount;
            });

            setUnreadCounts(counts);
        }
        catch(e) {
            console.error("안 읽은 메세지 수 조회 실패 : ", e);
        }
    }, [projectNo]);

    useEffect(() => {
        loadUnreadCount();
    }, [loadUnreadCount]);


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
                `/message/channel/${channelNo}`,
                { 
                    size : 100 , 
                    lastMessageNo : null 
                }
            );
            //console.log("과거 메세지 : ", data);
            
            setMessages(data.messages);
            setLast(data.last);
        }
        catch(e) {
            console.error("메세지 조회 실패 : ", e);
        }
    }, []);


    //● 채널 메세지 읽음 처리
    // const readChannelMessage = useCallback(async(channelNo) => {
    //     try {
    //         await apiClient.post(
    //             `/message/${channelNo}/read`
    //         );

    //         //console.log("메세지 읽음 처리 성공!");
    //     }
    //     catch(e) {
    //         console.log("메세지 읽음 처리 실패", e);
    //     }
    // }, []);


    //● 채널 변경시 해당 채널에 대한 메세지 조회
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
        if(oldestMessageNo === null) return;//아직 메세지가 없다면 종료

        try {
            const { data } = await apiClient.post(
                `/message/channel/${selectedChannel.chatChannelNo}`,
                { 
                    size : 100 , 
                    lastMessageNo : oldestMessageNo 
                }
            );

            const newMessages = data.messages;
            
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

        const result = await Swal.fire({
            title: "메세지를 삭제하시겠습니까?",
            text: "삭제한 메세지는 복구할 수 없습니다",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "삭제",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;

        try {
            await apiClient.delete(`/message/${message.no}`);

            //- 삭제 후 메세지 목록 다시 불러오기
            //loadMessages(selectedChannel.chatChannelNo);
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

        if(content === null) return;//메세지 수정 취소
        if(content.trim() === "") return;//빈 문자열 방지

        try {
            await apiClient.put(`/message/${message.no}`, {
                content: content
            });

            //- 수정 후 다시 조회 → 서버가 Websocket으로 수정 결과를 보내주기 때문에 필요없음
            //loadMessages(selectedChannel.chatChannelNo);

        }
        catch(e) {
            console.error("메시지 수정 실패", e);
        }
    };


    //● Websocket 연결 함수
    //● Websocket 연결 함수
const connetToServer = useCallback(() => {

    //(1) 연결(socket) 생성
    const socket = new SockJS(
        `${import.meta.env.VITE_SERVER_URL}/ws`
    );

    //(2) 연결을 관리할 도구(client) 생성
    const client = new Client({
        webSocketFactory: () => socket,

        //- 웹소켓 연결 성공
        onConnect: () => {

            console.log("WebSocket 연결 성공!");

            //==================================================
            // [1] 모든 채널의 메세지 구독
            //==================================================
            channels.forEach(channel => {

                const channelNo = channel.chatChannelNo;

                client.subscribe(
                    `/public/${channelNo}/chat`,

                    (message) => {

                        const json = JSON.parse(message.body);

                        console.log(
                            `채널 ${channelNo} 메세지 수신 : `,
                            json
                        );

                        //==================================================
                        // 현재 선택된 채널인지 확인
                        //==================================================
                        if(
                            selectedChannel &&
                            selectedChannel.chatChannelNo === channelNo
                        ) {

                            // 현재 보고 있는 채널
                            // → 메세지 화면에 추가
                            setMessages(prev => [
                                ...prev,
                                json
                            ]);

                            // 다른 사람이 보낸 메세지라면 읽음 처리
                            if(json.empNo !== loginUser.empNo) {

                                client.publish({
                                    destination: `/app/${channelNo}/read`
                                });

                            }

                        }
                        else {

                            //==================================================
                            // 다른 채널에서 온 메세지
                            // → 해당 채널 unreadCount + 1
                            //==================================================

                            if(json.empNo !== loginUser.empNo) {

                                setUnreadCounts(prev => ({
                                    ...prev,
                                    [channelNo]:
                                        (prev[channelNo] || 0) + 1
                                }));

                            }

                        }
                    }
                );


                //==================================================
                // [2] 읽음 처리 알림 구독
                //==================================================
                client.subscribe(
                    `/public/${channelNo}/read`,

                    (message) => {

                        const json = JSON.parse(message.body);

                        console.log(
                            `채널 ${channelNo} 읽음 처리 알림 : `,
                            json
                        );

                        // 현재 채널의 메시지 unreadCount 갱신
                        if(
                            selectedChannel &&
                            selectedChannel.chatChannelNo === channelNo
                        ) {

                            setMessages(prev =>
                                prev.map(message => {

                                    const unread = json.messages.find(
                                        item =>
                                            item.messageNo === message.no
                                    );

                                    if(unread) {

                                        return {
                                            ...message,
                                            unreadCount:
                                                unread.unreadCount
                                        };

                                    }

                                    return message;
                                })
                            );

                        }

                        // 채널 목록 unreadCount
                        // 해당 채널을 읽었으므로 0
                        setUnreadCounts(prev => ({
                            ...prev,
                            [channelNo]: 0
                        }));

                    }
                );


                //==================================================
                // [3] 메세지 수정 알림
                //==================================================
                client.subscribe(
                    `/public/${channelNo}/update`,

                    (message) => {

                        const json = JSON.parse(message.body);

                        console.log(
                            "메세지 수정 알림 : ",
                            json
                        );

                        setMessages(prev =>
                            prev.map(message => {

                                if(
                                    message.no === json.messageNo
                                ) {

                                    return {
                                        ...message,
                                        content: json.content,
                                        utime: json.utime
                                    };

                                }

                                return message;

                            })
                        );

                    }
                );


                //==================================================
                // [4] 메세지 삭제 알림
                //==================================================
                client.subscribe(
                    `/public/${channelNo}/delete`,

                    (message) => {

                        const json = JSON.parse(message.body);

                        console.log(
                            "메세지 삭제 알림 : ",
                            json
                        );

                        setMessages(prev =>
                            prev.map(message => {

                                if(
                                    message.no === json.messageNo
                                ) {

                                    return {
                                        ...message,
                                        deleted: "Y"
                                    };

                                }

                                return message;

                            })
                        );

                    }
                );

            });


            //==================================================
            // [5] 현재 채널 입장 → 읽음 처리
            //==================================================
            if(selectedChannel) {

                client.publish({
                    destination:
                        `/app/${selectedChannel.chatChannelNo}/read`
                });

            }

        },

        //- 디버깅
        debug: (str) => console.log(str)
    });

    //(3) 클라이언트 활성화
    client.activate();

    return client;

}, [channels, selectedChannel, loginUser]);






    // const connetToServer = useCallback(() => {
    //     //(1) 연결(socket) 생성
    //     const socket = new SockJS(
    //         `${import.meta.env.VITE_SERVER_URL}/ws`
    //     );

    //     //(2) 연결을 관리할 도구(client) 생성
    //     const client = new Client({
    //         //- 연결 객체를 생성하는 함수
    //         webSocketFactory: () => socket,

    //         //- 웹소켓 연결 성공
    //         onConnect: () => {
    //             const channelNo = selectedChannel.chatChannelNo;

    //             //console.log("WebSocket 연결 성공!", channelNo);

    //             //[1] 채팅 메세지 구독
    //             client.subscribe(
    //                 `/public/${channelNo}/chat`,

    //                 (message) => {
    //                     const json = JSON.parse(message.body);
    //                     //console.log("실시간 메시지:", json);

    //                     //(1) 메세지를 화면에 추가
    //                     setMessages(prev => [
    //                         ...prev,
    //                         json
    //                     ]);

    //                     //(2) 다른 사람이 보낸 메세지라면 읽음 처리
    //                     //- 새 메세지를 포함해서 현재 채널을 읽음 : /read 사용
    //                     if(json.empNo !== loginUser.empNo) {
    //                         client.publish({
    //                             destination: `/app/${channelNo}/read`
    //                         });
    //                     }
    //                 }
    //             );

    //             //[2] 메세지 읽음 처리 알림 구독
    //             //- React : "나 이 채널 들어와서 메세지들 전부 읽었어"라고 서버로 Send
    //             //- 메시지 전송 → 서버가 unreadCount 계산 → /chat으로 전달
    //             //- 채널 입장 → React가 /read로 서버에 알림 → 서버가 DB 읽음 처리 → 최신 unreadCount들을 /read로 다시 방송 → React가 화면 숫자 갱신
    //             client.subscribe(
    //                 `/public/${channelNo}/read`,
    //                 (message) => {

    //                     const json = JSON.parse(message.body);

    //                     console.log("읽음 처리 알림:", json);

    //                     setMessages(prev =>
    //                         prev.map(message => {

    //                             const unread = json.messages.find(
    //                                 item => item.messageNo === message.no
    //                             );

    //                             if(unread) {
    //                                 return {
    //                                     ...message,
    //                                     unreadCount: unread.unreadCount
    //                                 };
    //                             }
    //                             //- 과거 메세지 : DB에서 unreadCount 조회
    //                             //- 새 메시지 : WebSocket chat에서 unreadCount 전달
    //                             //- 읽음 처리 : WebSocket read에서 최신 unreadCount 전달
    //                             return message;
    //                         })
    //                     );
    //                 }
    //             );

    //             //[3] 메세지 수정 알림 구독
    //             client.subscribe(
    //                 `/public/${channelNo}/update`,
    //                 (message) => {
    //                     const json = JSON.parse(message.body);

    //                     console.log("메세지 수정 알림 : ", json);

    //                     setMessages(prev =>
    //                         prev.map(message => {
                                
    //                             if(message.no === json.messageNo) {
    //                                 return {
    //                                     ...message,
    //                                     content: json.content,
    //                                     utime: json.utime
    //                                 };
    //                             }
    //                             return message;
    //                         })
    //                     );
    //                 }
    //             );

    //             //[4] 메세지 삭제 알림 구독
    //             client.subscribe(
    //                 `/public/${channelNo}/delete`,
    //                 (message) => {

    //                     const json = JSON.parse(message.body);

    //                     console.log("메세지 삭제 알림 : ", json);

    //                     setMessages(prev =>
    //                         prev.map(message => {

    //                             if(message.no === json.messageNo) {
    //                                 return {
    //                                     ...message,
    //                                     deleted: "Y"
    //                                 };
    //                             }

    //                             return message;
    //                         })
    //                     );
    //                 }
    //             );

    //             //[5] 내가 채널에 들어왔다는 것을 서버에 전달
    //             //- 채널 입장 시 기본 메세지 전부 읽음 : /read 사용
    //             client.publish({
    //                 destination: `/app/${channelNo}/read`
    //             });
    //         },

    //         //- 디버깅 설정(옵션)
    //         debug: (str) => console.log(str)
    //     });

    //     //(3) 클라이언트 활성화
    //     client.activate();
        
    //     return client;
    // }, [selectedChannel, loadMessages]);


    //● Websocket 연결 종료 함수
    const disconnectFromServer = useCallback((client) => {
        if(client) {
            client.deactivate();
        }
    }, []);


    //● WebSocket 연결 및 해제
    useEffect(() => {

        if(channels.length === 0) return;

        const client = connetToServer();

        setClient(client);

        return () => {

            disconnectFromServer(client);
            setClient(null);

        };

    }, [channels, connetToServer, disconnectFromServer]);








    // useEffect(() => {
    //     if (selectedChannel === null) return;

    //     //(1) 최초 실행
    //     const client = connetToServer();
    //     setClient(client);

    //     //(2) 페이지 이탈 또는 채널 변경 시
    //     return() => {
    //         disconnectFromServer(client);
    //         setClient(null);
    //     }
    // }, [selectedChannel, connetToServer, disconnectFromServer]);


    //● view
    return(<>
        <div className="chat-page">

            <ChatSidebar 
                channels={channels} 
                selectedChannel={selectedChannel}
                setSelectedChannel={setSelectedChannel}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                unreadCounts={unreadCounts}
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