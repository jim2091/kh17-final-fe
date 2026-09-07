import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { apiClient } from "../../utils/reaxios";
import Swal from "sweetalert2";
import { FiPlus } from "react-icons/fi";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { FaPenToSquare } from "react-icons/fa6";
import { Button, Form, FormGroup, Modal } from "react-bootstrap";
import { FaTrashAlt } from "react-icons/fa";

export default function ChatSidebar(
    { 
        channels,
        selectedChannel,
        setSelectedChannel,
        sidebarOpen,
        setSidebarOpen,
        unreadCounts,
        canManageChannel,
        loadChannelList
    }
) {
    const {projectNo} = useParams();
    const [channelModal, setChannelModal] = useState(false);
    //모달 하나로 등록/수정 다 처리 예정
    const [channelModalMode, setChannelModalMode] = useState("create");
    const [channelName, setChannelName] = useState("");
    const [targetChannel, setTargetChannel] =useState(null);
    const [channelMenuNo, setChannelMenuNo] = useState(null);
    const [saving, setSaving] = useState(false);

    const openCreateModal = useCallback(()=>{
        setChannelModalMode("create");
        setTargetChannel(null);
        setChannelName("");
        setChannelModal(true);
    }, []);

    const openEditModal = useCallback((channel) => {
        setChannelModalMode("edit");
        setTargetChannel(channel);
        // #은 서버에서 달아주므로 입력창에서는 #이 달린 이름을 불러오고 제거해줌
        setChannelName(channel.chatChannelName.replace(/^#/, ""));
        setChannelMenuNo(null);
        setChannelModal(true);
    }, []);
    
    const saveChannel = async() => {
        const name = channelName.trim();

        if(name === "") {
            toast.warning("채널명을 입력해주세요");
            return;
        }

        try {
            if(saving === true) return;
            setSaving(true);

            //등록
            if(channelModalMode === "create") {
                await apiClient.post("/channel/", {
                    projectNo: Number(projectNo),
                    chatChannelName: name
                });

                toast.success("채널을 생성했습니다");
            }
            //수정
            else {
                await apiClient.put(`/channel/${targetChannel.chatChannelNo}`,{
                    projectNo: Number(projectNo),
                    chatChannelName: name
                });

                toast.success("채널명을 수정했습니다");
            }

            setChannelModal(false);

            //바뀌었으니 다시 로드 한 번 해주고
            await loadChannelList();
        }
        catch(e) {
            console.error(e);
            toast.error(
                channelModalMode === "create"
                    ? "채널 생성에 실패했습니다"
                    : "채널 수정에 실패했습니다"
            );
        }
        finally {
            setSaving(false);
        }
    };

    const deleteChannel = async(channel) => {
        setChannelMenuNo(null);

        const result = await Swal.fire({
            title: "채널을 삭제하시겠습니까?", 
            text : `${channel.chatChannelName} 채널의 메시지도 함께 삭제될 수 있습니다 이거 나중에 로직 고칠건데 끝나가는 시점에 이 메시지가 보인다면 제게 알려주세요`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "삭제",
            cancelButtonText: "취소"
        });
        if(result.isConfirmed === false) return;

        try {
            await apiClient.delete(
                `/channel/${channel.chatChannelNo}`,
                {
                    data: {
                        projectNo: Number(projectNo)
                    }
                }
            );

            toast.success("채널을 삭제했습니다")

            //현재 보고 있던 채널을 삭제했다면 새 목록 로딩 후 첫 번째 채널을 다시 선택하도록 초기화
            if(selectedChannel?.chatChannelNo === channel.chatChannelNo) {
                setSelectedChannel(null);
            }
            
            await loadChannelList();
        }
        catch(e) {
            console.error(e);
            toast.error("채널 삭제에 실패했습니다");
        }
    };

    useEffect(() => {
        const closeChannelMenu = () => {
            setChannelMenuNo(null);
        };

        document.addEventListener("click", closeChannelMenu);

        return () => {
            document.removeEventListener("click", closeChannelMenu);
        };
    }, []);

    return(<>
        <div className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}>
            <div className="sidebar-header">
                <div className="sidebar-title">
                    채널
                </div>
                <div className="sidebar-header-actions">
                    {canManageChannel && (
                        <button
                            type="button"
                            className="channel-add-button"
                            onClick={openCreateModal}
                            title="채널 생성"
                        >
                            <FiPlus />
                        </button>
                    )}
                    <button
                        type="button"
                        className="sidebar-close"
                        onClick={() => setSidebarOpen(false)}
                    >
                        ×
                    </button>
                </div>

            </div>

            <div className="channel-list">
                {channels?.map(channel => {
                    const active = 
                        selectedChannel?.chatChannelNo === channel.chatChannelNo;
                    
                    const isGeneral = channel.chatChannelName.toLowerCase() === "#general";

                    return (
                        <div
                            className="channel-item-wrapper"
                            key={channel.chatChannelNo}
                        >
                            <button
                                type="button"
                                className={
                                    active ? "channel-item active" : "channel-item"
                                }
                                onClick={() => {
                                    setSelectedChannel(channel)
                                    setSidebarOpen(false)
                                }}
                            >
                    
                                <span className="channel-name">
                                    {channel.chatChannelName}
                                </span>

                                {unreadCounts?.[channel.chatChannelNo] > 0 && (
                                    <span className="channel-unread-badge">
                                        {unreadCounts[channel.chatChannelNo]}
                                    </span>
                                )}
                            </button>

                            {/* 채팅채널 관리자도 아니고 general도 아닐 때 */}
                            {canManageChannel && !isGeneral && (
                                <div className="channel-menu-wrapper">
                                    <button
                                        type="button"
                                        className="channel-menu-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setChannelMenuNo(
                                                channelMenuNo === channel.chatChannelNo
                                                 ? null
                                                 : channel.chatChannelNo
                                            );
                                        }}
                                    >
                                        <HiOutlineDotsHorizontal />
                                    </button>

                                    {channelMenuNo === channel.chatChannelNo && (
                                        <div className="channel-menu"
                                            onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(channel)}
                                            >
                                                <FaPenToSquare />
                                                수정
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => deleteChannel(channel)}
                                            >
                                                <FaTrashAlt />
                                                삭제
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    );
                })}
            </div>
        </div>

        {/* 등록/수정 모달 */}
        <Modal
            show={channelModal}
            onHide={() => setChannelModal(false)}
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title>
                    {channelModalMode === "create"
                        ? "채널 생성"
                        : "채널 수정"}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <FormGroup>
                    <Form.Label className="channel-modal-label">
                        채널명
                    </Form.Label>

                    <div className="channel-name-input">
                        <span className="channel-name-prefix">
                            #
                        </span>
                        <Form.Control
                            type="text"
                            value={channelName}
                            onChange={(e) => setChannelName(e.target.value)}
                            placeholder="채널명을 입력하세요"
                            autoFocus
                            onKeyDown={(e) => {
                                if(e.key === "Enter") {
                                    saveChannel();
                                }
                            }}
                        />
                    </div>
                </FormGroup>

                <div className="channel-modal-help">
                    프로젝트 구성원 모두가 이 채널을 사용할 수 있습니다
                </div>
            </Modal.Body>

            <Modal.Footer>
                <Button
                    variant="secondary"
                    onClick={() => setChannelModal(false)}
                >
                    취소
                </Button>

                <Button
                    onClick={saveChannel}
                    disabled={saving}
                >
                    {saving
                        ? "저장 중..."
                        : channelModalMode === "create"
                            ? "생성"
                            : "수정"}
                </Button>
            </Modal.Footer>
        </Modal>

    </>)
}