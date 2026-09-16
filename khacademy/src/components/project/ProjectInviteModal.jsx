import { useCallback, useState ,useEffect } from "react"
import Swal from "sweetalert2";
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
import { Button, Modal, Spinner } from "react-bootstrap";

export default function ProjectInviteModal({
    show,onHide,notification,onSuccess,
}){
    const [loading,setLoading] = useState(false);
    const [statusLoading,setStatusLoading] = useState(false);
    const [inviteStatus,setInviteStatus] = useState(null);
    
    //초대 수락
    const acceptInvite = useCallback(async()=>{
        
        if(!notification)return;

        const result = await Swal.fire({
            icon : "question",
            title : "프로젝트 초대 수락",
            text : "프로젝트에 참여하시겠습니까?",
            showCancelButton : true,
            confirmButtonText : "수락",
            cancelButtonText : "취소",
        });

        if(!result.isConfirmed) return;

        try{
            setLoading(true);

            await apiClient.patch(
                `/project/invite/${notification.notificationTarget}/accept`
            );
            toast.success("프로젝트 초대를 수락했습니다");

            setInviteStatus("수락");

            if(onSuccess){
                await onSuccess();
            }  
        }
        catch(e){
            toast.error(
                e.response?.data?.message
                ?? "프로젝트 초대 수락에 실패했습니다"
            );
        }

        finally{
            setLoading(false);
        }

    },[notification,onHide,onSuccess]);

    //초대 거절
    const rejectInvite = useCallback(async()=>{
        
        if(!notification) return;

        const result = await Swal.fire({
            icon : "warning",
            title : "프로젝트 초대 거절",
            text : "프로젝트에 초대를 거절하시겠습니까?",
            showCancelButton : true,
            confirmButtonText : "거절",
            cancelButtonText : "취소",
        });

        if(!result.isConfirmed)return;

        try{
            setLoading(true);
            
            await apiClient.patch(
                `/project/invite/${notification.notificationTarget}/reject`
            );

            toast.success("프로젝트 초대를 거절했습니다.");

            setInviteStatus("거절");

            if(onSuccess){
                await onSuccess();
            }
        }

        catch(e){
            toast.error(
                e.response?.data?.message
                ?? "프로젝트 초대 거절에 실패했습니다."
            );
        }

        finally{
            setLoading(false);
        }
    },[notification,onHide,onSuccess]);

    useEffect(() => {

    if(!show || !notification?.notificationTarget){
        return;
    }

    const loadInvite = async () => {

            try{
                // 조회 시작
                setStatusLoading(true);

                // 이전 초대 상태 제거
                setInviteStatus(null);

                const response = await apiClient.get(
                    `/project/invite/${notification.notificationTarget}`
                );

                console.log("초대 상세 조회:", response.data);

                setInviteStatus(
                    response.data.projectInviteStatus
                );
            }
            catch(e){
                console.error(
                    "초대 상태 조회 실패",
                    e
                );

                toast.error(
                    "초대 정보를 확인하지 못했습니다."
                );
            }
            finally{
                setStatusLoading(false);
            }
        };

        loadInvite();

    }, [show, notification]);


    // useEffect보다 아래에 위치
    if(!notification){
        return null;
    }

    return(<>

        <Modal show={show}
                onHide={loading ? undefined : onHide}
                centered
        >
            <Modal.Header closeButton={!loading}>
                <Modal.Title>
                    프로젝트 초대
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
               {
                    statusLoading
                    ?
                    (
                        <div className="text-center py-4">
                            <Spinner size="sm" className="me-2"/>
                            초대 정보를 확인하고 있습니다.
                        </div>
                    )
                    :
                    inviteStatus === "대기"
                    ?
                    (
                        <div className="project-invite-modal-content">
                            <div className="project-invite-message">
                                {notification.notificationContent}
                            </div>

                            <div className="project-invite-description">
                                초대를 수락하면 프로젝트 멤버로 참여하게 됩니다.
                            </div>
                        </div>
                    )
                    :
                    (
                        <div className="project-invite-modal-content">
                            <div className="project-invite-description">
                                {
                                    inviteStatus === "수락"
                                    ?
                                    "이 프로젝트의 초대를 수락했습니다."
                                    :
                                    inviteStatus === "거절"
                                    ?
                                    "이 프로젝트의 초대를 거절했습니다."
                                    :
                                    "처리된 프로젝트 초대입니다."
                                }
                            </div>
                        </div>
                    )
               }
            </Modal.Body>

            <Modal.Footer>

                {
                    statusLoading
                    ?
                    null
                    :
                    inviteStatus === "대기"
                    ?
                    (
                        <>
                            <Button
                                variant="outline-danger"
                                onClick={rejectInvite}
                                disabled={loading}
                            >
                                거절
                            </Button>

                            <Button
                                className="project-primary-button"
                                onClick={acceptInvite}
                                disabled={loading}
                            >
                                {
                                    loading
                                    ?
                                    <>
                                        <Spinner
                                            size="sm"
                                            className="me-2"
                                        />
                                        처리중
                                    </>
                                    :
                                    "수락"
                                }
                            </Button>
                        </>
                    )
                    :
                    (
                        <Button
                            className="project-primary-button"
                            onClick={onHide}
                        >
                            확인
                        </Button>
                    )
                }

            </Modal.Footer>


        </Modal>
    </>)
}