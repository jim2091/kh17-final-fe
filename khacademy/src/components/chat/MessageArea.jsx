import { useAtomValue } from "jotai";
import { loginUserState } from "@utils/storage";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { FaTrashAlt } from "react-icons/fa";
import { FaPenToSquare } from "react-icons/fa6";
import { FiAlertCircle } from "react-icons/fi";
import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

export default function MessageArea(
    { 
        messages = [], 
        onLoadMore,
        onEdit,
        onDelete
    }
) {
    //● state
    const loginUser = useAtomValue(loginUserState);
    const [menuMessageNo, setMenuMessageNo] = useState(null);//현재 메뉴가 열려있는 메세지 번호


    //● ref
    const messageAreaRef = useRef();//메세지 영역
    const bottomFlag = useRef(true);//현재 맨 아래를 보고 있는지
    const previousScrollHeight = useRef(0);//과거 메세지 추가 전 스크롤 정보
    const previousScrollTop = useRef(0);//과거 메세지 추가 전 스크롤 정보
    const loadingMoreRef = useRef(false);//과거 메시지를 요청 중인지


    //● 맨 아래로 이동
    const keepScrollBottom = useCallback(() => {
        if(messageAreaRef.current) {
            messageAreaRef.current.scrollTop 
                = messageAreaRef.current.scrollHeight;
        }
    }, []);


    //● messages가 변경될 때 스크롤 처리
    //[주의] 위로 스크롤해서 과거 메시지를 추가해도, 내가 보고 있던 메시지가 그대로 그 자리에 있어야 함
    useEffect(() => {
        if(!messageAreaRef.current) return;

        //- 과거 메세지를 추가한 경우
        if(loadingMoreRef.current === true) {

            const currentScrollHeight = 
                messageAreaRef.current.scrollHeight;
            
            //- 과거 메세지가 추가되면서 늘어난 높이
            const heightDifference =
                currentScrollHeight - previousScrollHeight.current;

            //- 기존에 보고 있던 위치를 유지
            messageAreaRef.current.scrollTop =
                previousScrollTop.current + heightDifference;

            //- 로딩 완료
            loadingMoreRef.current = false;

            return;
        }

        //- 일반 메세지 변경 (원래 맨 아래를 보고 있었다면 아래 유지)
        if(bottomFlag.current === true) {
            keepScrollBottom();
        }
    }, [messages, keepScrollBottom]);


    //● 현재 스크롤 위치(맨 아래) 확인
    const isScrollBottom = useCallback(() => {
        if(!messageAreaRef.current) return;

        const {scrollTop, scrollHeight, clientHeight}
            = messageAreaRef.current;
            
        //- 맨 아래인지 확인
        const diff = scrollHeight - scrollTop - clientHeight;
        
        bottomFlag.current = diff <= 5;
        //console.log("스크롤 맨 아래 여부 :", bottomFlag.current);
        
        if(scrollTop > 5) return;//맨 위가 아니라면 아무것도 하지 않음

        if(loadingMoreRef.current) return;//이미 불러오는 중이면 중복 요청 방지

        if(onLoadMore) {
            //- 과거 메시지를 추가하기 전의 위치 저장
            previousScrollHeight.current = scrollHeight;
            previousScrollTop.current = scrollTop;

            //- 로딩 시작
            loadingMoreRef.current = true;
            
            //- 과거 메세지 요청
            onLoadMore();
        }
    }, [onLoadMore]);


    //● view
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
                                            {message.deleted === "Y" ? (
                                                <span className="deleted-message">
                                                    <FiAlertCircle />
                                                    삭제된 메세지 입니다.
                                                </span>
                                            ) : (
                                                message.content
                                            )}
                                        </div>

                                        {message.unreadCount > 0 && (
                                            <span className="unread-count">
                                                {message.unreadCount}
                                            </span>
                                        )}

                                        {message.deleted !=="Y" &&
                                        message.utime &&
                                        message.ctime &&
                                        message.utime !== message.ctime && (
                                            <div className="edited">
                                                (수정됨)
                                            </div>
                                        )}

                                        <div className="time">
                                            {dayjs(message.ctime).format("HH:mm")}
                                        </div>

                                    </div>

                                    {/* 내가 보낸 메세지이고 삭제되지 않은 경우 */}
                                    {isMine && message.deleted !== "Y" && (
                                        <div className="message-menu-wrapper">
                                            <button 
                                                className="message-menu-button"
                                                onClick={() => {
                                                    setMenuMessageNo(
                                                        menuMessageNo === message.no
                                                        ? null 
                                                        : message.no
                                                    );
                                                }}
                                            >
                                            <HiOutlineDotsHorizontal />
                                            </button>
                                            {/* 메뉴 */}
                                            {menuMessageNo === message.no && (
                                                <div className="message-menu">
                                                    <button
                                                        type="button"
                                                        onClick={() => onEdit(message)}
                                                    >
                                                        <FaPenToSquare />
                                                        <span>수정</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onDelete(message)}
                                                    >
                                                        <FaTrashAlt />
                                                        <span>삭제</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>

                    </Fragment>
                );
            })}
        </main>
    );
}