import { useAtomValue } from "jotai";
import { loginUserState } from "@utils/storage";
import { Fragment, useCallback, useEffect, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

export default function MessageArea({ messages = [] }) {
    const loginUser = useAtomValue(loginUserState);

    //● 스크롤을 끝으로 갱신
    const messageAreaRef = useRef();

    const bottomFlag = useRef(true);

    //- messages가 변경될 때 사용자가 원래 맨 아래쪽을 보고 있었다면 다시 아래쪽으로 이동 
    useEffect(() => {
        if(bottomFlag.current === true) {
            keepScrollBottom();
        }
    }, [messages]);

    //- 현재 스크롤이 맨 아래에 있는지 확인
    const isScrollBottom = useCallback(() => {
        if(messageAreaRef.current) {
            const {scrollTop, scrollHeight, clientHeight}
                = messageAreaRef.current;
            
            const diff = scrollHeight - scrollTop - clientHeight;

            bottomFlag.current = diff <= 5;

            console.log("스크롤 맨 아래 여부 :", bottomFlag.current);
        }
    }, []);

    //- 맨 아래로 이동
    const keepScrollBottom = useCallback(() => {
        if(messageAreaRef.current) {
            messageAreaRef.current.scrollTop 
                = messageAreaRef.current.scrollHeight;
        }
    }, []);


    return (
        <main 
            className="message-area" 
            ref={messageAreaRef}
            onScroll={isScrollBottom}
        >
            {messages.map((message, index) => {

                // 내가 보낸 메시지인지 확인
                const isMine = message.empNo === loginUser?.empNo;

                // 이전 메시지
                const prevMessage = messages[index - 1];

                // 현재 메시지 날짜
                const currentDate = dayjs(message.ctime).format("YYYY-MM-DD");

                // 이전 메시지 날짜
                const prevDate = prevMessage
                    ? dayjs(prevMessage.ctime).format("YYYY-MM-DD")
                    : null;

                // 날짜가 바뀌었는지 확인
                const isNewDate = currentDate !== prevDate;

                return (
                    <Fragment key={message.no}>

                        {/* 날짜가 바뀌었으면 날짜 표시 */}
                        {isNewDate && (
                            <div className="date-divider">
                                {dayjs(message.ctime).format("YYYY년 MM월 DD일")}
                            </div>
                        )}

                        {/* 메시지 하나 */}
                        <div
                            className={`message-outer ${isMine ? "my" : ""}`}
                        >
                            <div className="message-inner">

                                {/* 다른 사람이 보낸 메시지만 이름 표시 */}
                                {!isMine && (
                                    <div className="profile-wrapper">
                                        {/* 프로필 이미지 자리 */}
                                    </div>
                                )}

                                <div className="content-wrapper">

                                    {/* 다른 사람이 보낸 메시지만 이름 표시 */}
                                    {!isMine && (
                                        <div className="sender">
                                            {message.senderName}
                                        </div>
                                    )}

                                    <div className="content">

                                        <div className="body">
                                            {message.content}
                                        </div>

                                        <div className="time">
                                            {dayjs(message.ctime).format("HH:mm")}
                                        </div>

                                    </div>
                                </div>

                            </div>
                        </div>

                    </Fragment>
                );
            })}
        </main>
    );
}