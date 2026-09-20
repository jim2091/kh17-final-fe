import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import dayjs from "dayjs";
import { FiSend } from "react-icons/fi";
import { apiClient } from "@utils/reaxios";
import { loginUserState } from "@utils/storage";
import { getWebSocketClient, onWebSocketReconnect } from "@utils/websocket";

export default function DmChatRoom({  room }) {
    const loginUser = useAtomValue(loginUserState);

    const [messages, setMessages] = useState([]);

    const [input, setInput] = useState("");

    const [loading, setLoading] = useState(true);

    const messageAreaRef = useRef(null);

    const roomNo = room?.roomNo;

    //==================================================
    // 가장 아래로 이동
    //==================================================

    const scrollToBottom =
        useCallback(() => {
            requestAnimationFrame(() => {

                const target = messageAreaRef.current;

                if(!target) return;

                target.scrollTop = target.scrollHeight;

            });

        }, []);


    //==================================================
    // 기존 메시지 조회
    //==================================================

    const loadMessages = useCallback(async () => {

            if(!roomNo) return;

            try {
                setLoading(true);

                const response = await apiClient.post(
                        `/dm/room/${roomNo}/messages`,
                        {
                            size: 50
                        }
                    );

                setMessages(response.data?.messages || []);

                scrollToBottom();
            }
            catch(e) {
                console.error("DM 메시지 조회 실패", e);
            }
            finally {
                setLoading(false);
            }
        }, [roomNo, scrollToBottom]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    //==================================================
    // DM WebSocket 구독
    //==================================================
    useEffect(() => {

        if(!roomNo) return;

        let subscription = null;

        const subscribe = () => {
            //재연결 시 기존 구독 정리
            if(subscription) {
                subscription.unsubscribe();
                subscription = null;
            }

            const client = getWebSocketClient();

            if(!client || client.connected !== true) {
                return;
            }

            subscription = client.subscribe(
                    `/public/dm/${roomNo}/chat`,
                    message => {
                        const json =
                            JSON.parse(
                                message.body
                            );

                        setMessages(prev => {
                            //중복 수신 방지
                            const exists =
                                prev.some(item => item.no === json.no);

                            if(exists) return prev;

                            return [...prev, json];
                        });

                        scrollToBottom();
                    }
                );
        };

        //현재 연결되어 있으면 즉시 실행되고,
        //재연결 시에도 다시 실행
        const removeReconnect = onWebSocketReconnect(subscribe);

        return () => {
            if(subscription) {
                subscription.unsubscribe();
            }

            if(removeReconnect) {
                removeReconnect();
            }
        };
    }, [roomNo, scrollToBottom]);

    //==================================================
    // DM 전송
    //==================================================

    const sendMessage = useCallback(() => {
            const content = input.trim();
            if(content === "" || !roomNo) {
                return;
            }

            const client = getWebSocketClient();

            if(!client || client.connected !== true) {
                console.error("WebSocket이 연결되어 있지 않습니다.");
                return;
            }

            client.publish({
                destination: `/app/dm/${roomNo}/chat`,
                body: JSON.stringify({content})
            });

            //실제 메시지 추가는
            //서버 WebSocket 응답으로 처리
            setInput("");

        }, [input, roomNo]);

    //==================================================
    // 키보드
    //==================================================

    const handleKeyDown = e => {

        //한글 조합 중 Enter 방지
        if(e.nativeEvent.isComposing) {
            return;
        }

        //Enter 전송
        //Shift + Enter 줄바꿈
        if(e.key === "Enter"
            && e.shiftKey === false) {

            e.preventDefault();

            sendMessage();
        }

    };

    return (
        <div className="dm-chat-room">

            {/* 상대방 정보 */}
            <div className="dm-chat-target-info">

                <div className="dm-chat-target-name">
                    {room.targetEmpName}
                </div>

                <div className="dm-chat-target-sub">

                    {room.targetPositionName}

                    {room.targetPresence && (
                        <>
                            {" · "}
                            {room.targetPresence}
                        </>
                    )}

                </div>

            </div>

            {/* 메시지 */}
            <div
                className="dm-chat-message-area"
                ref={messageAreaRef}
            >

                {loading === true ? (
                    <div className="dm-chat-empty">
                        메시지를 불러오는 중입니다.
                    </div>
                ) : messages.length === 0 ? (

                    <div className="dm-chat-empty">

                        아직 대화가 없습니다.
                        <br />
                        첫 메시지를 보내보세요.

                    </div>

                ) : (
                    messages.map(message => {
                        const isMine =
                            Number(message.senderNo)
                            === Number(loginUser?.empNo);

                        return (
                            <div
                                key={message.no}
                                className={
                                    isMine
                                        ? "dm-message-row mine"
                                        : "dm-message-row"
                                }
                            >

                                <div className="dm-message-group">
                                    {!isMine && (
                                        <div className="dm-message-sender">
                                            {message.senderName}
                                        </div>
                                    )}

                                    <div className="dm-message-line">
                                        <div className="dm-message-body">
                                            {message.content}
                                        </div>

                                        <span className="dm-message-time">
                                            {dayjs(
                                                message.ctime
                                            ).format("HH:mm")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

            </div>

            {/* 입력창 */}
            <div className="dm-chat-input-area">
                <textarea
                    className="dm-chat-input"
                    value={input}
                    placeholder={`${room.targetEmpName}님에게 메시지 보내기`}
                    rows={1}
                    onChange={
                        e =>
                            setInput(
                                e.target.value
                            )
                    }
                    onKeyDown={
                        handleKeyDown
                    }
                />

                <button
                    type="button"
                    className="dm-chat-send"
                    onClick={sendMessage}
                    disabled={
                        input.trim() === ""
                    }
                >
                    <FiSend />
                </button>
            </div>
        </div>
    );
}