import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useOutletContext, useParams } from "react-router-dom";
import { getWebSocketClient, onWebSocketConnect } from "@utils/websocket";
import { apiClient } from "../../utils/reaxios";
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
    const {project} = useOutletContext();

    const isClosed = project?.projectStatus === "closed";
    const isManagerOrOwner = 
        project?.projectMemberRole === "owner"
        || project?.projectMemberRole === "manager";
    const canManageCannel = isManagerOrOwner && !isClosed;
    const loginUser = useAtomValue(loginUserState);

    const [channels, setChannels] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [last, setLast] = useState(true);//과거 메세지가 더 있는지 여부(true/false)
    const [sidebarOpen, setSidebarOpen] = useState(false);
    //채널 구독 effect에서 channels를 연관항목에 넣지 않고 현재 채널을 알기 위한 Ref
    const selectedChannelRef = useRef(null);


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
        loadChannelList();
        loadUnreadCount();
    }, [loadChannelList, loadUnreadCount]);


    //● 채널 선택
    useEffect(() => {
        //- 첫 번째 채널(#general) 기본 선택
        if(channels.length > 0 && selectedChannel === null) {
            setSelectedChannel(channels[0]);
        }
    }, [channels, selectedChannel]);

    //현재 선택 채널 Ref 갱신
    useEffect(() => {
        selectedChannelRef.current = selectedChannel;
    }, [selectedChannel]);


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

    //● 채널 변경시 해당 채널에 대한 메세지 조회 후 읽음 처리
    useEffect(() => {
        if (!selectedChannel) return;

        //loadMessages는 비동기 함수라 서버 읽음처리와 따로 실행하면
        //채널에 들어갔을때 읽음처리가 먼저 수행되고 로드가 되서
        //시점이 안맞아 반영이 안되는 문제가 생길 수 있음
        //그래서 둘을 합쳐서 async함수로 만들고 await로 load가 끝난 후에
        //읽음 처리가 실행되도록 만듬
        const enterChannel = async () => {
            //1. 먼저 메시지 조회
            await loadMessages(selectedChannel.chatChannelNo);

            //2. 조회가 끝난 뒤 읽음 처러
            onWebSocketConnect(() => {
                const client = getWebSocketClient();
                if(client === null) return;

                client.publish({
                    destination: `/app/${selectedChannel.chatChannelNo}/read`
                });

                // 채널별 안읽은 메세지 수도 0으로
                setUnreadCounts(prev => ({
                    ...prev,
                    [selectedChannel.chatChannelNo]: 0
                }));
            });
        };

        enterChannel();

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
        
        const client = getWebSocketClient();
        if(client === null || client.connected === false) {
            return;//WebSocket 연결이 안됐으면 전송하지 않음
        }

        //(2) 메세지 전송을 위한 JSON 데이터 생성
        const json = { content : input };

        client.publish({
            destination: `/app/${selectedChannel.chatChannelNo}/chat`,
            body: JSON.stringify(json)
        });

        //(3) 메세지 입력창 비우기
        setInput("");

    }, [input, selectedChannel]);


    //● 메세지 삭제 
    const handleDelete = async(message) => {

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
    const handleEdit = async(message) => {
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

    // 구독 관리 effect
    useEffect(()=>{
        if(channels.length === 0) return;
        const subscriptions = [];

        onWebSocketConnect(() => {
            const client = getWebSocketClient();

            if(client === null) return;

            //각 채널의 구독 관리(/chat, /read, /update, /delete)
            channels.forEach(channel => {
                const channelNo = channel.chatChannelNo;

                // /chat 구독
                const chatSubscription = client.subscribe(
                    `/public/${channelNo}/chat`,
                    (message) => {
                        const json = JSON.parse(message.body);

                        console.log(`${channelNo} 채널 메세지 수신 : `, json);

                        const currentChannel = selectedChannelRef.current;
                        //현재 보고 있는 채널의 메세지면
                        if(
                            currentChannel && 
                            currentChannel.chatChannelNo === channelNo
                        ){
                            //messages에 추가하고
                            setMessages(prev => [...prev, json]);
                            //다른 사람이 보낸 message면 읽음처리도 해주고
                            if(json.empNo !== loginUser.empNo) {
                                client.publish({
                                    destination: `/app/${channelNo}/read`
                                });
                            }
                        }
                        //현재 보고 있는 채널의 메세지가 아니면
                        else {
                            if(json.empNo !== loginUser.empNo) {
                                //채널별 안읽은 메세지수 추가해주고
                                setUnreadCounts(prev => ({
                                    ...prev,
                                    [channelNo] : (prev[channelNo] || 0) + 1
                                }));
                            }
                        }
                    }
                );

                subscriptions.push(chatSubscription);

                
                // /read 구독
                const readSubscription = client.subscribe(
                    `/public/${channelNo}/read`,
                    (message) => {
                        const json = JSON.parse(message.body);
                        console.log(`${channelNo} 채널 읽음 처리 알림 : `, json);
    
                        const currentChannel = selectedChannelRef.current;
                        //현재 보고 있는 채널의 메세지면
                        if(
                            currentChannel &&
                            currentChannel.chatChannelNo === channelNo
                        ) {
                            setMessages(prev => 
                                prev.map(message => {
                                    const unread = json.messages.find(
                                        item => item.messageNo === message.no
                                    );

                                    if(unread) {
                                        return {
                                            ...message,
                                            unreadCount: unread.unreadCount
                                        };
                                    }
                                    return message;
                                })
                            );
                        }
                    }
                );

                subscriptions.push(readSubscription);
    
                // /update 구독
                const updateSubscription = client.subscribe(
                    `/public/${channelNo}/update`,
                    (message) => {
                        const json = JSON.parse(message.body);
    
                        console.log("메세지 수정 알림 : ", json);
    
                        setMessages(prev => 
                            prev.map(message => {
                                if(message.no === json.messageNo) {
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

                subscriptions.push(updateSubscription);


                // /delete 구독
                const deleteSubscription = client.subscribe(
                    `/public/${channelNo}/delete`,
                    (message) => {
                        const json = JSON.parse(message.body);

                        console.log("메세지 삭제 알림 : ", json);

                        setMessages(prev => 
                            prev.map(message => {
                                if(message.no === json.messageNo) {
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

                subscriptions.push(deleteSubscription);

            });

        });

        //클린업함수. 구독 해제
        return () => {
            subscriptions.forEach(subscription => {
                subscription.unsubscribe();
            });
        };

    }, [channels, loginUser]);

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
                canManageCannel={canManageCannel}
                loadChannelList={loadChannelList}
            />

            {sidebarOpen && (
                <div
                    className="chat-sidebar-backdrop"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="chat-main">
                <ChatHeader 
                    selectedChannel={selectedChannel}
                    setSidebarOpen={setSidebarOpen}
                />

                <MessageArea 
                    messages={messages}
                    onLoadMore={loadMoreMessages}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
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