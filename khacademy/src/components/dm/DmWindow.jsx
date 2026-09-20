import { Rnd } from "react-rnd";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { FiArrowLeft, FiMessageCircle, FiX } from "react-icons/fi";
import dayjs from "dayjs";
import { dmWindowOpenState, dmTargetState } from "@utils/storage";
import { apiClient } from "@utils/reaxios";
import "./DmWindow.css";
import DmChatRoom from "./DmChatRoom";
import { loginUserState } from "../../utils/storage";
import { getWebSocketClient, onWebSocketReconnect } from "../../utils/websocket";


export default function DmWindow() {

    const setDmWindowOpen = useSetAtom(dmWindowOpenState);

    const dmTarget = useAtomValue(dmTargetState);

    const setDmTarget = useSetAtom(dmTargetState);

    const loginUser = useAtomValue(loginUserState);

    //현재 화면
    //LIST / CHAT
    const [viewMode, setViewMode] = useState("LIST");

    //DM방 목록
    const [roomList, setRoomList] = useState([]);

    //선택된 DM방
    const [selectedRoom, setSelectedRoom] = useState(null);

    //목록 로딩
    const [loading, setLoading] = useState(true);

    //DM방 목록 조회
    const loadRoomList = useCallback(async () => {
        try {
            setLoading(true);

            const response = await apiClient.get("/dm/rooms");

            setRoomList(response.data || []);
        }
        catch (e) {
            console.error("DM 목록 조회 실패", e);
            setRoomList([]);
        }
        finally {
            setLoading(false);
        }
    }, []);

    //DM 목록 실시간 갱신
    useEffect(() => {
        const empNo = loginUser?.empNo;

        if(!empNo) return;

        let subscription = null;

        const subscribe = () => {
            if(subscription) {
                subscription.unsubscribe();
                subscription = null;
            }

            const client = getWebSocketClient();

            if(!client || client.connected !== true) return;

            subscription = client.subscribe(
                `/public/dm/user/${empNo}/rooms`,
                () => {
                    //서버 DB가 기준이므로 목록을 다시 조회
                    loadRoomList();
                }
            );
        };

        const removeReconnect = onWebSocketReconnect(subscribe);

        return () => {
            if(subscription) {
                subscription.unsubscribe();
            }

            if(removeReconnect){
                removeReconnect();
            }
                        
        };

    }, [loginUser?.empNo, loadRoomList]);

    //외부 화면에서 특정 사용자와 DM 요청
    const openTargetRoom = useCallback(async () => {

        if (!dmTarget?.targetEmpNo) {
            return;
        }

        try {
            //기존 DM방이 있으면 조회,
            //없으면 새로 생성
            const { data } = await apiClient.post(
                `/dm/room/${dmTarget.targetEmpNo}`
            );

            //방 정보 + 부서에서 전달받은 상대방 정보 결합
            setSelectedRoom({
                roomNo: data.dmRoomNo,
                targetEmpNo: dmTarget.targetEmpNo,
                targetEmpName: dmTarget.targetEmpName,
                targetPositionName: dmTarget.targetPositionName,
                targetPresence: dmTarget.targetPresence,
                targetAttachNo: dmTarget.targetAttachNo
            });

            //바로 채팅 화면으로 이동
            setViewMode("CHAT");
        }
        catch (e) {
            console.error("DM방 열기 실패", e);
        }
        finally {
            //요청 소비 완료
            setDmTarget(null);
        }
    }, [dmTarget, setDmTarget]);

    useEffect(() => {
        if (!dmTarget) return;
        openTargetRoom();
    }, [dmTarget, openTargetRoom]);

    //처음 DM창 열릴 때 목록 조회
    useEffect(() => {
        loadRoomList();
    }, [loadRoomList]);

    //DM 창 닫기
    const closeWindow = () => {
        setDmWindowOpen(false);
    };

    //DM방 선택
    const openRoom = room => {
        setSelectedRoom(room);
        setViewMode("CHAT");
    };

    //목록으로 돌아가기
    const backToList = () => {

        setSelectedRoom(null);
        setViewMode("LIST");
        //다시 목록을 불러와 최신 메시지 순서를 갱신
        loadRoomList();
    };

    return (
        <Rnd
            default={{
                x: Math.max(
                    20,
                    window.innerWidth - 430
                ),
                y: 90,
                width: 380,
                height: 520
            }}
            minWidth={320}
            minHeight={360}
            maxWidth={650}
            maxHeight={800}
            bounds="window"
            dragHandleClassName="dm-window-header"
            className="dm-window-rnd"
        >

            <div className="dm-window">

                {/* =========================
                    HEADER
                ========================== */}
                <div className="dm-window-header">
                    <div className="dm-window-header-left">
                        {viewMode === "CHAT" && (
                            <button
                                type="button"
                                className="dm-window-back"
                                onClick={backToList}
                                onPointerDown={
                                    e => e.stopPropagation()
                                }
                            >
                                <FiArrowLeft />
                            </button>
                        )}

                        <div className="dm-window-title">
                            {viewMode === "LIST"
                                ? "DM"
                                : selectedRoom?.targetEmpName
                            }
                        </div>
                    </div>

                    <button
                        type="button"
                        className="dm-window-close"
                        onClick={closeWindow}
                        onPointerDown={
                            e => e.stopPropagation()
                        }
                    >
                        <FiX />
                    </button>

                </div>

                {/* =========================
                    CONTENT
                ========================== */}
                <div className="dm-window-content">
                    {viewMode === "LIST" ? (

                        /* =========================
                            DM 목록
                        ========================== */
                        <div className="dm-room-list">
                            {loading === true ? (
                                <div className="dm-window-empty">
                                    DM 목록을 불러오는 중입니다.
                                </div>

                            ) : roomList.length === 0 ? (

                                <div className="dm-window-empty">
                                    <FiMessageCircle
                                        className="dm-empty-icon"
                                    />
                                    <div>
                                        아직 대화 내역이 없습니다.
                                    </div>
                                </div>
                            ) : (
                                roomList.map(room => (
                                    <button
                                        type="button"
                                        className="dm-room-item"
                                        key={room.roomNo}
                                        onClick={() =>
                                            openRoom(room)
                                        }
                                    >
                                        {/* 프로필 */}
                                        <div className="dm-room-profile">
                                            <span className="dm-room-profile-text">
                                                {
                                                    room.targetEmpName
                                                        ?.substring(0, 1)
                                                }
                                            </span>

                                            <span
                                                className={
                                                    `dm-presence-dot ${room.targetPresence
                                                        ?.toLowerCase()
                                                    }`
                                                }
                                            />

                                        </div>

                                        {/* 내용 */}
                                        <div className="dm-room-info">
                                            <div className="dm-room-top">
                                                <div className="dm-room-name">
                                                    {room.targetEmpName}
                                                    {room.targetPositionName && (
                                                        <span className="dm-room-position">
                                                            {room.targetPositionName}
                                                        </span>
                                                    )}

                                                </div>

                                                <div className="dm-room-time">

                                                    {room.lastMessageTime
                                                        ? dayjs(
                                                            room.lastMessageTime
                                                        ).format("MM/DD HH:mm")
                                                        : ""
                                                    }
                                                </div>
                                            </div>

                                            <div className="dm-room-last-message">
                                                {room.lastMessage}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    ) : (
                        <DmChatRoom room={selectedRoom} />
                    )}
                </div>
            </div>
        </Rnd>
    );
}