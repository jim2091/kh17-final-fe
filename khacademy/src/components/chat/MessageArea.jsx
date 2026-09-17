import { useAtomValue } from "jotai";
import { loginUserState } from "@utils/storage";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { FaTrashAlt } from "react-icons/fa";
import { FaPenToSquare } from "react-icons/fa6";
import { FiAlertCircle, FiFileText } from "react-icons/fi";
import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

export default function MessageArea(
    {
        messages = [],
        onLoadMore,
        onEdit,
        onDelete,
        onRecord,
        isClosed,

        targetMessageNo,
        onTargetHandled,

        scrollBottomTrigger,

        autoFollowLatest = true,
        onBottomChange
    }
) {
    //● state
    const loginUser = useAtomValue(loginUserState);
    const [menuMessageNo, setMenuMessageNo] = useState(null);//현재 메뉴가 열려있는 메세지 번호

    //현재 수정 중인 메세지 번호
    const [editingMessageNo, setEditingMessageNo] = useState(null);
    //수정 입력값
    const [editingContent, setEditingContent] = useState("");
    //수정 저장 중 여부
    const [editSaving, setEditSaving] = useState(false);

    //● ref
    const messageAreaRef = useRef();//메세지 영역
    const bottomFlag = useRef(true);//현재 맨 아래를 보고 있는지
    const previousScrollHeight = useRef(0);//과거 메세지 추가 전 스크롤 정보
    const previousScrollTop = useRef(0);//과거 메세지 추가 전 스크롤 정보
    const loadingMoreRef = useRef(false);//과거 메시지를 요청 중인지


    //● 맨 아래로 이동
    const keepScrollBottom = useCallback(() => {
        if (messageAreaRef.current) {
            messageAreaRef.current.scrollTop
                = messageAreaRef.current.scrollHeight;
        }
    }, []);

    //● messages가 변경될 때 스크롤 처리
    //[주의] 위로 스크롤해서 과거 메시지를 추가해도, 내가 보고 있던 메시지가 그대로 그 자리에 있어야 함
    useEffect(() => {
        if (!messageAreaRef.current) return;

        //- 과거 메세지를 추가한 경우
        if (loadingMoreRef.current === true) {

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
        if (
            bottomFlag.current === true
            && autoFollowLatest == true
        ) {
            keepScrollBottom();
        }
    }, [messages, keepScrollBottom]);


    //● 현재 스크롤 위치(맨 아래) 확인
    const isScrollBottom = useCallback(() => {
        if (!messageAreaRef.current) return;

        const { scrollTop, scrollHeight, clientHeight }
            = messageAreaRef.current;

        //- 맨 아래인지 확인
        const diff = scrollHeight - scrollTop - clientHeight;

        bottomFlag.current = diff <= 5;
        //console.log("스크롤 맨 아래 여부 :", bottomFlag.current);

        if (onBottomChange) {
            onBottomChange(bottomFlag.current);
        }

        if (scrollTop > 5) return;//맨 위가 아니라면 아무것도 하지 않음

        if (loadingMoreRef.current) return;//이미 불러오는 중이면 중복 요청 방지

        if (onLoadMore) {
            //- 과거 메시지를 추가하기 전의 위치 저장
            previousScrollHeight.current = scrollHeight;
            previousScrollTop.current = scrollTop;

            //- 로딩 시작
            loadingMoreRef.current = true;

            //- 과거 메세지 요청
            onLoadMore();
        }
    }, [onLoadMore]);

    // 메세지 메뉴 닫힐 수 있게
    useEffect(() => {
        const closeMenu = () => {
            setMenuMessageNo(null);
        };

        document.addEventListener("click", closeMenu);

        return () => {
            document.removeEventListener("click", closeMenu);
        };
    }, []);

    //검색 결과 하이라이트
    const [highlightMessageNo, setHighlightMessageNo] = useState(null);

    //검색 등으로 특정 메세지 위치로 이동
    useEffect(() => {

        if (!targetMessageNo) return;

        const animationFrame = requestAnimationFrame(() => {

            const target = document.getElementById(
                `chat-message-${targetMessageNo}`
            );

            if (!target) return;

            //target 위치를 보고 있으므로
            //현재 맨 아래 상태가 아님
            bottomFlag.current = false;

            target.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            setHighlightMessageNo(
                targetMessageNo
            );

            if (onTargetHandled) {
                onTargetHandled();
            }
        });


        const timer = setTimeout(() => {
            setHighlightMessageNo(null);
        }, 2000);


        return () => {
            cancelAnimationFrame(animationFrame);
            clearTimeout(timer);
        };

    }, [
        targetMessageNo,
        messages,
        onTargetHandled
    ]);

    //외부에서 최신 메세지 위치 이동 요청
    useEffect(() => {
        if (scrollBottomTrigger === 0) return;
        if (!messageAreaRef.current) return;

        keepScrollBottom();

        //현재 위치도 맨 아래 상태로 갱신
        bottomFlag.current = true;
    }, [scrollBottomTrigger, keepScrollBottom]);

    //● 메세지 수정 시작
    const startEdit = useCallback((message) => {
        setMenuMessageNo(null);

        setEditingMessageNo(message.no);
        setEditingContent(message.content || "");

    }, []);

    //● 메세지 수정 취소
    const cancelEdit = useCallback(() => {
        if (editSaving) return;

        setEditingMessageNo(null);
        setEditingContent("");
    }, [editSaving]);

    //● 메세지 수정 저장
    const saveEdit = useCallback(async (message) => {
        if (editSaving) return;

        //공백만 입력한 경우
        if (editingContent.trim() === "") {
            return;
        }

        //내용이 바뀌지 않았다면 그냥 수정 종료
        if (editingContent === message.content) {
            setEditingMessageNo(null);
            setEditingContent("");

            return;
        }
        try {
            setEditSaving(true);

            const success = await onEdit(message, editingContent);

            //API 요청 성공 시에만 편집모드 종료
            if (success === true) {
                setEditingMessageNo(null);
                setEditingContent("");
            }
        }
        finally {
            setEditSaving(false);
        }

    }, [
        editSaving,
        editingContent,
        onEdit
    ]);

    //● 수정 입력창 키보드 처리
    const handleEditKeyDown =
        useCallback((e, message) => {
            //한글 입력 조합 중 Enter 방지
            if (e.nativeEvent.isComposing) return;

            //ESC → 수정 취소
            if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
                return;
            }

            //Enter → 저장
            //Shift + Enter → 줄바꿈
            if (
                e.key === "Enter"
                && e.shiftKey === false
            ) {
                e.preventDefault();
                saveEdit(message);
            }

        }, [
            cancelEdit,
            saveEdit
        ]);

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

                //현재 수정 중인 메세지인지
                const isEditing = editingMessageNo === message.no;

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
                            id={`chat-message-${message.no}`}
                            className={
                                `message-outer
                                ${isMine ? "my" : ""}
                                ${highlightMessageNo === message.no
                                    ? "message-target-highlight"
                                    : ""
                                }`
                            }
                        >
                            <div className="message-inner">

                                {/* 다른 사람이 보낸 메시지만 프로필 표시 */}
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

                                    <div
                                        className={`
                                            content ${isEditing
                                                    ? "message-editing"
                                                    : ""}
                                            `}
                                    >

                                        {isEditing ? (
                                            //메세지 수정 중
                                            <div className="message-edit-box">

                                                <textarea
                                                    className="message-edit-textarea"
                                                    value={editingContent}
                                                    onChange={(e) =>
                                                        setEditingContent(
                                                            e.target.value
                                                        )
                                                    }
                                                    onKeyDown={(e) =>
                                                        handleEditKeyDown(
                                                            e,
                                                            message
                                                        )
                                                    }
                                                    rows={2}
                                                    autoFocus
                                                    disabled={editSaving}
                                                />


                                                <div className="message-edit-footer">

                                                    <span className="message-edit-guide">
                                                        Esc 취소 · Enter 저장
                                                    </span>

                                                    <div className="message-edit-actions">
                                                        <button
                                                            type="button"
                                                            className="message-edit-cancel"
                                                            onClick={cancelEdit}
                                                            disabled={editSaving}
                                                        >
                                                            취소
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="message-edit-save"
                                                            onClick={() =>
                                                                saveEdit(message)
                                                            }
                                                            disabled={
                                                                editSaving
                                                                || editingContent.trim() === ""
                                                            }
                                                        >
                                                            {editSaving
                                                                ? "저장 중"
                                                                : "저장"
                                                            }
                                                        </button>

                                                    </div>

                                                </div>

                                            </div>

                                        ) : (<>

                                            {/* 일반 메세지 표시 */}
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
                                                <span className="message-unread-count">
                                                    {message.unreadCount}
                                                </span>
                                            )}

                                            {message.deleted !== "Y"
                                                && message.utime
                                                && message.ctime
                                                && message.utime !== message.ctime && (
                                                    <div className="edited">
                                                        (수정됨)
                                                    </div>
                                                )}

                                            <div className="time">
                                                {dayjs(message.ctime).format("HH:mm")}
                                            </div>
                                        </>)}
                                    </div>

                                    {/* 내가 보낸 메세지이고 삭제되지 않은 경우 */}
                                    {message.deleted !== "Y"
                                    && isEditing === false
                                    && (isMine || (isClosed === false)) && (
                                        <div className="message-menu-wrapper">
                                            <button
                                                className="message-menu-button"
                                                onClick={(e) => {
                                                    //실제 메뉴 클릭했을 때 document까지 퍼지지 않게
                                                    e.stopPropagation();

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
                                                <div className="message-menu" onClick={(e) => e.stopPropagation()}>

                                                    {/* Record는 프로젝트 멤버라면 사용 가능 */}
                                                    {isClosed === false && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onRecord(message);
                                                                setMenuMessageNo(null);
                                                            }}
                                                        >
                                                            <FiFileText />
                                                            <span>Record로 남기기</span>
                                                        </button>
                                                    )}

                                                    {/* 수정/삭제는 내 매세지만 */}
                                                    {isMine && (<>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                startEdit(message);
                                                            }}
                                                        >
                                                            <FaPenToSquare />
                                                            <span>수정</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="message-menu-delete"
                                                            onClick={() => {
                                                                setMenuMessageNo(null);
                                                                onDelete(message);
                                                            }}
                                                        >
                                                            <FaTrashAlt />
                                                            <span>삭제</span>
                                                        </button>
                                                    </>)}
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