import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useOutletContext, useParams, useSearchParams } from "react-router-dom";
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

import RecordLinkModal from "../records/RecordLinkModal";
import { FiArrowDown } from "react-icons/fi";

export default function Chat() {
    //● state
    const { projectNo } = useParams();
    const { project } = useOutletContext();

    const isClosed = project?.projectStatus === "closed";
    const isManagerOrOwner =
        project?.projectMemberRole === "owner"
        || project?.projectMemberRole === "manager";
    const canManageChannel = isManagerOrOwner && !isClosed;
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

    //Record 연결 대상 메시지
    const [recordTargetMessage, setRecordTargetMessage] = useState(null);
    const [recordModalOpen, setRecordModalOpen] = useState(false);

    //채팅 검색
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [searchMessages, setSearchMessages] = useState([]);
    const [searchTotalCount, setSearchTotalCount] = useState(0);
    const [searchPage, setSearchPage] = useState(1);
    const [searchLast, setSearchLast] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);

    //특정 메세지 위치로 이동
    const [targetMessageNo, setTargetMessageNo] = useState(null);
    const [contextMode, setContextMode] = useState(false);

    const SEARCH_SIZE = 20;

    //최신 메세지 위치 이동 신호
    const [scrollBottomTrigger, setScrollBottomTrigger] = useState(0);

    //record에서 채팅 원본 이동 시
    //채널 변경 후 표시할 context 임시 저장
    //안해주면 기본 general에서 다른 채널로 이동될 때 selectedChannel useEffect가
    //새로 조회하면서 context를 덮어쓸 수 있음
    const recordContextRef = useRef(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const recordMessageNo = searchParams.get("messageNo");

    //현재 채널에서 아래쪽에 새로 도착한 메세지
    const [pendingMessageCount, setPendingMessageCount] = useState(0);
    const [latestPendingMessage, setLatestPendingMessage] = useState(null);

    //현재 메세지 영역이 맨 아래인지
    const messageBottomRef = useRef(true);

    //WebSocket 내부에서 최신 search/context 상태 확인용
    const searchOpenRef = useRef(false);
    const contextModeRef = useRef(false);


    //● 채널 목록 불러오기
    const loadChannelList = useCallback(async () => {
        try {
            const { data } = await apiClient.get(
                `/channel/project/${projectNo}`
            );
            setChannels(data);
        }
        catch (e) {
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
        catch (e) {
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
        if (channels.length > 0 && selectedChannel === null) {
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
                    size: 100,
                    lastMessageNo: null
                }
            );
            //console.log("과거 메세지 : ", data);

            setMessages(data.messages);
            setLast(data.last);
        }
        catch (e) {
            console.error("메세지 조회 실패 : ", e);
        }
    }, []);

    //● 채널 변경시 해당 채널에 대한 메세지 조회 후 읽음 처리
    useEffect(() => {
        if (!selectedChannel) return;

        //채널 변경시 검색 상태도 초기화
        setSearchOpen(false);
        setSearchKeyword("");
        setSearchMessages([]);
        setSearchTotalCount(0);
        setSearchPage(1);
        setSearchLast(true);

        setContextMode(false);
        setTargetMessageNo(null);

        setPendingMessageCount(0);
        setLatestPendingMessage(null);
        messageBottomRef.current = true;

        //loadMessages는 비동기 함수라 서버 읽음처리와 따로 실행하면
        //채널에 들어갔을때 읽음처리가 먼저 수행되고 로드가 되서
        //시점이 안맞아 반영이 안되는 문제가 생길 수 있음
        //그래서 둘을 합쳐서 async함수로 만들고 await로 load가 끝난 후에
        //읽음 처리가 실행되도록 만듬
        const enterChannel = async () => {

            //(+) record에서 넘어온 실행일경우 처리코드 추가
            const pendingContext = recordContextRef.current;

            //record 원본 이동 때문에 변경된 채널이라면
            if (
                pendingContext
                && pendingContext.channelNo === selectedChannel.chatChannelNo
            ) {
                applyMessageContext(pendingContext);

                //한 번 사용했으므로 제거
                recordContextRef.current = null;
            }
            //일반적인 채널 이동
            else {
                setContextMode(false);
                setTargetMessageNo(null);

                //1. 먼저 메시지 조회
                await loadMessages(selectedChannel.chatChannelNo);
            }


            //2. 조회가 끝난 뒤 읽음 처러
            onWebSocketConnect(() => {
                const client = getWebSocketClient();
                if (client === null) return;

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
        if (!messages || messages.length === 0) {
            return null;
        }
        return messages[0].no;
    }, [messages]);


    //● 더보기 과거 메세지 100개 가져오기
    const loadMoreMessages = useCallback(async () => {

        if (!selectedChannel) return;//채널을 선택하지 않았으면 종료
        if (last === true) return;//과거 메세지가 더 이상 없으면 종료
        if (oldestMessageNo === null) return;//아직 메세지가 없다면 종료

        try {
            const { data } = await apiClient.post(
                `/message/channel/${selectedChannel.chatChannelNo}`,
                {
                    size: 100,
                    lastMessageNo: oldestMessageNo
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
        catch (e) {
            console.error("메세지 조회 실패 : ", e);
        }
    }, [selectedChannel, last, oldestMessageNo]);


    //● 메세지 전송
    const sendMessage = useCallback(() => {

        //(1)종료 프로젝트는 메세지 전송 불가
        if (isClosed) return;
        //(2) 메세지를 전송할 수 있는 상태인지 검증
        if (!selectedChannel) return;//채널을 선택하지 않았으면 전송하지 않음
        if (input.trim() === "") return;//입력값이 비어있으면 전송하지 않음

        const client = getWebSocketClient();
        if (client === null || client.connected === false) {
            return;//WebSocket 연결이 안됐으면 전송하지 않음
        }

        //(3) 메세지 전송을 위한 JSON 데이터 생성
        const json = { content: input };

        client.publish({
            destination: `/app/${selectedChannel.chatChannelNo}/chat`,
            body: JSON.stringify(json)
        });

        //(4) 메세지 입력창 비우기
        setInput("");

    }, [input, selectedChannel, isClosed]);


    //● 메세지 삭제 
    const handleDelete = async (message) => {

        //종료 프로젝트는 메세지 전송 불가
        if (isClosed) return;

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
        catch (e) {
            console.error("메시지 삭제 실패", e);
        }
    };


    //● 메세지 수정
    const handleEdit = async (message, content) => {

        //종료 프로젝트는 메세지 수정 불가
        if (isClosed) return false;

        //빈 문자열 방지
        if (!content || content.trim() === "") {
            return false;
        }

        try {
            await apiClient.put(
                `/message/${message.no}`,
                {
                    content: content
                }
            );

            //수정 결과는 서버가 WebSocket /update로 보내줌
            return true;
        }
        catch (e) {
            console.error("메시지 수정 실패", e);
            return false;
        }
    };

    //메세지를 Record로 남기기
    const handleRecord = useCallback((message) => {
        setRecordTargetMessage(message);
        setRecordModalOpen(true);

    }, []);

    const closeRecordModal = useCallback(() => {
        setRecordModalOpen(false);
        setRecordTargetMessage(null);
    }, []);

    // 구독 관리 effect
    useEffect(() => {
        if (channels.length === 0) return;
        const subscriptions = [];

        onWebSocketConnect(() => {
            const client = getWebSocketClient();

            if (client === null) return;

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
                        if (
                            currentChannel &&
                            currentChannel.chatChannelNo === channelNo
                        ) {
                            // //messages에 추가하고
                            // setMessages(prev => [...prev, json]);
                            // //다른 사람이 보낸 message면 읽음처리도 해주고
                            // if (json.empNo !== loginUser.empNo) {
                            //     client.publish({
                            //         destination: `/app/${channelNo}/read`
                            //     });
                            // }

                            const isMine = json.empNo === loginUser.empNo;

                            //검색 결과의 과거 context를 보는 중이 아니라면
                            //실제 메세지 목록에 새 메세지 추가
                            if (contextModeRef.current === false) {
                                setMessages(prev => [
                                    ...prev,
                                    json
                                ]);
                            }

                            //다른 사람이 보낸 메세지
                            if (isMine === false) {
                                //현재 채널에 들어와 있으므로 서버 기준 읽음 처리
                                client.publish({
                                    destination: `/app/${channelNo}/read`
                                });

                                //화면상 최신 위치를 바로 보고 있지 않다면
                                //새 메세지 안내 표시
                                if (
                                    messageBottomRef.current === false
                                    || searchOpenRef.current === true
                                    || contextModeRef.current === true
                                ) {
                                    setLatestPendingMessage(json);

                                    setPendingMessageCount(
                                        prev => prev + 1
                                    );
                                }
                            }
                        }
                        //현재 보고 있는 채널의 메세지가 아니면
                        else {
                            if (json.empNo !== loginUser.empNo) {
                                //채널별 안읽은 메세지수 추가해주고
                                setUnreadCounts(prev => ({
                                    ...prev,
                                    [channelNo]: (prev[channelNo] || 0) + 1
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
                        if (
                            currentChannel &&
                            currentChannel.chatChannelNo === channelNo
                        ) {
                            setMessages(prev =>
                                prev.map(message => {
                                    const unread = json.messages.find(
                                        item => item.messageNo === message.no
                                    );

                                    if (unread) {
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
                                if (message.no === json.messageNo) {
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
                                if (message.no === json.messageNo) {
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

    //채팅 검색 관련
    const searchMessage = useCallback(async (pageNo = 1, append = false) => {

        if (!selectedChannel) return;
        if (searchKeyword.trim() === "") return;

        try {
            setSearchLoading(true);

            const { data } = await apiClient.post(
                `/message/channel/${selectedChannel.chatChannelNo}/search`,
                {
                    keyword: searchKeyword.trim(),
                    page: pageNo,
                    size: SEARCH_SIZE
                }
            );

            if (append) {
                setSearchMessages(prev => [
                    ...prev,
                    ...data.messages
                ]);
            }
            else {
                setSearchMessages(data.messages);
            }
        }
        catch (e) {
            console.error("메세지 검색 실패 : ", e);
        }
        finally {
            setSearchLoading(false);
        }

    }, [selectedChannel, searchKeyword]);

    const loadMoreSearchMessages = useCallback(() => {

        if (searchLast === true) return;
        if (searchLoading === true) return;

        searchMessage(searchPage + 1, true);
    }, [searchLast, searchLoading, searchPage, searchMessage]);

    //특정 메세지 위치로 이동
    const openMessageContext = useCallback(async (messageNo) => {
        try {
            const { data } = await apiClient.get(`/message/${messageNo}/context`);

            applyMessageContext(data);
        }
        catch (e) {
            console.error("메세지 위치 조회 실패 : ", e);
        }
    }, []);

    //최신 메세지로 돌아가기
    const returnLatestMessages = useCallback(async () => {
        if (!selectedChannel) return;

        await loadMessages(selectedChannel.chatChannelNo);

        setContextMode(false);
        setTargetMessageNo(null);

        //최신 메세지 위치로 강제 이동
        setScrollBottomTrigger(prev => prev + 1);

    }, [selectedChannel, loadMessages]);

    //특정 메세지 context 화면에 적용
    const applyMessageContext = useCallback((data) => {
        setMessages(data.messages);
        setTargetMessageNo(data.targetMessageNo);
        setContextMode(true);
        setSearchOpen(false);
    }, []);

    //Record에서 넘어온 채팅 원본 처리
    useEffect(() => {
        if (!recordMessageNo) return;
        if (channels.length === 0) return;

        const openRecordMessage = async () => {
            try {
                const messageNo = Number(recordMessageNo);
                if (Number.isNaN(messageNo)) return;

                //해당 메세지의 주변 대화 조회
                const { data } = await apiClient.get(`/message/${messageNo}/context`);

                //메세지가 속한 채널 찾기
                const targetChannel = channels.find(
                    channel => channel.chatChannelNo === data.channelNo
                );

                if (!targetChannel) return;

                //현재 채널과 같은 경우
                if (selectedChannel && selectedChannel.chatChannelNo === data.channelNo) {
                    applyMessageContext(data);
                }
                //다른 채널인 경우
                else {
                    //채널 변경 effect가 context를 적용하도록 임시 저장
                    recordContextRef.current = data;
                    setSelectedChannel(targetChannel);
                }

                //한 번 처리한 query parameter 제거
                const nextParams = new URLSearchParams(searchParams);

                nextParams.delete("messageNo");

                setSearchParams(nextParams, { replace: true });
            }
            catch (e) {
                console.error("Record 채팅 원본 이동 실패 : ", e);
            }
        };

        openRecordMessage();

    }, [
        recordMessageNo,
        channels,
        selectedChannel,
        searchParams,
        setSearchParams,
        applyMessageContext
    ]);

    const handleTargetMessage = useCallback(() => {
        setTargetMessageNo(null);
    }, []);

    //최신 메세지 처리 관련 이펙트
    useEffect(() => {
        searchOpenRef.current = searchOpen;
    }, [searchOpen]);

    useEffect(() => {
        contextModeRef.current = contextMode;
    }, [contextMode]);

    const handleMessageBottomChange = useCallback((isBottom) => {
        messageBottomRef.current = isBottom;

        //context 화면의 맨 아래는 실제 최신 메세지가 아니므로 제외
        if (
            isBottom === true
            && contextModeRef.current === false
        ) {
            setPendingMessageCount(0);
            setLatestPendingMessage(null);
        }
    }, []);

    const moveToPendingMessage = useCallback(async () => {
        //검색 결과 등 과거 context를 보고 있으면
        //최신 목록 자체를 다시 불러와야 함
        if (contextMode === true) {
            await returnLatestMessages();
        }

        //일반 목록에서 위쪽을 보고 있는 경우
        else {
            setScrollBottomTrigger(prev => prev + 1);
        }

        messageBottomRef.current = true;

        setPendingMessageCount(0);
        setLatestPendingMessage(null);
    }, [contextMode, returnLatestMessages]);


    //● view
    return (<>
        <div className="chat-page">

            <ChatSidebar
                channels={channels}
                selectedChannel={selectedChannel}
                setSelectedChannel={setSelectedChannel}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                unreadCounts={unreadCounts}
                canManageChannel={canManageChannel}
                loadChannelList={loadChannelList}
            />

            {sidebarOpen && (
                <div
                    className="chat-sidebar-backdrop"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="chat-workspace">
                {/* 실제 채팅 영역 */}
                <div className="chat-main">
                    <ChatHeader
                        selectedChannel={selectedChannel}
                        setSidebarOpen={setSidebarOpen}

                        searchOpen={searchOpen}
                        setSearchOpen={setSearchOpen}

                        contextMode={contextMode}
                        onReturnLatest={returnLatestMessages}
                    />

                    <MessageArea
                        messages={messages}
                        onLoadMore={contextMode ? null : loadMoreMessages}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onRecord={handleRecord}
                        isClosed={isClosed}

                        targetMessageNo={targetMessageNo}
                        onTargetHandled={handleTargetMessage}

                        scrollBottomTrigger={scrollBottomTrigger}

                        autoFollowLatest={
                            searchOpen === false
                            && contextMode === false
                        }
                        onBottomChange={handleMessageBottomChange}
                    />

                    {latestPendingMessage && (
                        <button
                            type="button"
                            className="chat-new-message-preview"
                            onClick={moveToPendingMessage}
                        >
                            <span className="chat-new-message-sender">
                                {latestPendingMessage.senderName}
                            </span>

                            <span className="chat-new-message-content">
                                {latestPendingMessage.content}
                            </span>

                            {pendingMessageCount > 1 && (
                                <span className="chat-new-message-count">
                                    +{pendingMessageCount - 1}
                                </span>
                            )}

                            <FiArrowDown />

                        </button>
                    )}

                    {isClosed === false ? (
                        <MessageInput
                            input={input}
                            setInput={setInput}
                            onSend={sendMessage}
                        />

                    ) : (
                        <div>
                            종료된 프로젝트에서는 메세지를 작성할 수 없습니다.
                        </div>
                    )}

                </div>

                {/* 우측 검색 패널 */}
                {searchOpen && (
                    <div className="chat-search-panel">

                        <div className="chat-search-panel-header">

                            <span className="chat-search-panel-title">
                                메시지 검색
                            </span>

                            <button
                                type="button"
                                className="chat-search-close"
                                onClick={() =>
                                    setSearchOpen(false)
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            className="chat-search-form"
                            onSubmit={(e) => {
                                e.preventDefault();

                                searchMessage(
                                    1,
                                    false
                                );
                            }}
                        >
                            <input
                                type="text"
                                className="chat-search-input"
                                value={searchKeyword}
                                onChange={(e) =>
                                    setSearchKeyword(
                                        e.target.value
                                    )
                                }
                                placeholder="현재 채널에서 검색"
                                autoFocus
                            />

                            <button
                                type="submit"
                                className="chat-search-submit"
                                disabled={
                                    searchLoading
                                    || searchKeyword.trim() === ""
                                }
                            >
                                검색
                            </button>
                        </form>


                        {searchTotalCount > 0 && (
                            <div className="chat-search-count">
                                검색 결과 {searchTotalCount}건
                            </div>
                        )}


                        <div className="chat-search-result-list">

                            {searchLoading
                                && searchMessages.length === 0 ? (

                                <div className="chat-search-empty">
                                    검색 중...
                                </div>

                            ) : searchMessages.length === 0 ? (

                                <div className="chat-search-empty">
                                    검색 결과가 없습니다.
                                </div>

                            ) : (

                                searchMessages.map(message => (

                                    <button
                                        type="button"
                                        className="chat-search-result"
                                        key={message.no}
                                        onClick={() =>
                                            openMessageContext(
                                                message.no
                                            )
                                        }
                                    >
                                        <div className="chat-search-result-top">

                                            <span className="chat-search-sender">
                                                {message.senderName}
                                            </span>

                                            <span className="chat-search-time">
                                                {String(message.ctime)
                                                    .replace("T", " ")
                                                    .slice(0, 16)}
                                            </span>

                                        </div>

                                        <div className="chat-search-content">
                                            {message.content}
                                        </div>

                                    </button>

                                ))

                            )}

                        </div>


                        {!searchLast && (
                            <button
                                type="button"
                                className="chat-search-more"
                                disabled={searchLoading}
                                onClick={loadMoreSearchMessages}
                            >
                                {searchLoading
                                    ? "불러오는 중..."
                                    : "검색 결과 더보기"
                                }
                            </button>
                        )}

                    </div>
                )}

            </div>
        </div>

        {recordTargetMessage && (
            <RecordLinkModal
                show={recordModalOpen}
                onHide={closeRecordModal}
                projectNo={projectNo}
                relatedType="MESSAGE"
                relatedNo={recordTargetMessage.no}
                relatedTitle={recordTargetMessage.content}
            />
        )}

    </>)
}