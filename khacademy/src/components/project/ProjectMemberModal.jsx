import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { Badge, Button, Form, ListGroup, Modal, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function ProjectMemberModal({
    show,onHide,projectNo,project,loadProject
}){
    //프로젝트 멤버 목록
    const [memberList,setMemberList] = useState([]);

    //현재 로그인 사용자의 프로젝트 권한
    const role = project?.projectMemberRole;

    //네비
    const navigate = useNavigate();
    //owner여부
    const isOwner = role === "owner";

    //프로젝트 상태
    const isClosed = project?.projectStatus === "closed";
    //맴버 초대 가능 여부
    const canInvite = project?.projectVisibility === "public" || 
                        role === "owner" ||
                        role === "manager";

    //로딩
    const [loading , setLoading] = useState(false);

    //프로젝트 멤버 목록 조회
    const loadMemberList = useCallback(async ()=>{
        try{
            setLoading(true);
            const {data} = await apiClient.get(`/project/${projectNo}/member`);
            setMemberList(data);
        }

        catch(e){
            toast.error("프로젝트 멤버 목록을 불러오지 못했습니다.");
        }

        finally{
            setLoading(false);
        }
    },[projectNo]);

    //modal이 열릴때 멤버 목록 조회
    useEffect(()=>{
        if(show === true){
            loadMemberList();
        }
    },[show,loadMemberList]);

    //역할 변경
    const changeMemberRole = useCallback(async (member,role)=>{
        //역활과 같으면 처리하지 않음
        if(member.projectMemberRole === role){
            return;
        }

        const result = await Swal.fire({
            icon: "question",
            title : "프로젝트 권한 변경",
            text : `${member.empName}님의 권한을` +
                    `${role.toUpperCase()}로 변경하시겠습니까?`,
            showCancelButton : true,
            confirmButtonText : "변경",
            cancelButtonText : "취소"
        });

        //취소
        if(result.isConfirmed === false){
            return;
        }

        try{
            await apiClient.patch(`/project/${projectNo}/member/${member.projectMemberNo}/role`,
            {projectMemberRole : role})

            toast.success("프로젝트 권한이 변경되었습니다.");

            //목록 다시 조회
            loadMemberList();
        }
        catch(e){
            toast.error("프로젝트 권한 변경이 실패했습니다.");
        }
    },[projectNo,loadMemberList]);

    //owner 변경
    const changeOwner = useCallback(async(member)=>{
        const result = await Swal.fire({
            icon : "warning",
            title : "owner를 변경하시겠습니까?",
            text : `${member.empName}님에게 owner 권한을 이전합니다.`,
            showCancelButton : true,
            confirmButtonText : "변경",
            cancelButtonText : "취소"
        });

        if(result.isConfirmed === false){
            return;
        }

        try{
            await apiClient.patch(
                `/project/${projectNo}/owner/${member.projectMemberNo}`
            );

            toast.success("owner가 변경되었습니다.");

            //목록 다시 조회
            loadMemberList();
            //프로젝트 정보 다시 조회
            loadProject();
        }
        catch(e){
            toast.error("owner 변경에 실패했습니다.");
        }
    },[projectNo,loadProject,loadMemberList])

    //프로젝트 탈퇴
    const leaveProject = useCallback(async()=>{
        if(isOwner){
            await Swal.fire({
                icon : "warning",
                title : "owner는 탈퇴할 수 없습니다.",
                text : "먼저 다른 멤버에게 owner를 위임해주세요",
                confirmButtonText : "확인"
            });
            return;
        }

        const result = await Swal.fire({
            icon : "warning",
            title : "프로젝트에서 탈퇴하시겠습니까?",
            text : "탈퇴 후에는 프로젝트에 접근할 수 없습니다.",
            showCancelButton : true,
            confirmButtonText : "탈퇴",
            cancelButtonText : "취소",
            confirmButtonColor : "#dc3545"
        });

        if(result.isConfirmed === false){
            return;
        }

        try{
            await apiClient.delete(`/project/${projectNo}/member/leave`);

            toast.success("프로젝트에서 탈퇴했습니다.");
            
            onHide();

            navigate("/projects/my");
        }

        catch(e){
            toast.error("프로젝트 탈퇴에 실패했습니다.")
        }

    },[isOwner,projectNo,navigate,onHide])

    //멤버 강제 퇴장
    const kickMember = useCallback(async(member)=>{
        const  result = await Swal.fire({
            icon : "warning",
            title : "멤버를 강제퇴장시키겠습니까?",
            text : `${member.empName}님을 프로젝트에서 제외합니다.`,
            showCancelButton : true,
            confirmButtonText : "강제퇴장",
            cancelButtonText : "취소",
            confirmButtonColor : "#dc3545"
        });

        if(result.isConfirmed === false){
            return;
        }

        try{
            await apiClient.delete(`/project/${projectNo}/member/${member.projectMemberNo}`);

            toast.success(`/${member.empName}님이 프로젝트에서 제외되었습니다.`);

            await loadMemberList();
        }

        catch(e){
            toast.error("멤버 강제퇴장에 실패했습니다.");
        }

    },[projectNo,loadMemberList]);

    return(
        <Modal
            show={show}
            onHide={onHide}
            centered
            size="lg"
            className="project-modal"
        >

            {/* 헤더 */}
            <Modal.Header
                closeButton
                className="project-modal-header"
            >
                <div>
                    <Modal.Title className="project-modal-title">
                        프로젝트 멤버
                    </Modal.Title>

                    <div className="project-modal-description">
                        프로젝트에 참여중인 멤버와 권한을 관리할 수 있습니다.
                    </div>
                </div>
            </Modal.Header>


            <Modal.Body className="project-modal-body">

                {/* 참여 인원 */}
                <div className="project-modal-count">

                    <div>
                        현재 참여 인원
                    </div>

                    <span className="project-member-count">
                        {memberList.length}명
                    </span>

                </div>


                {/* 로딩 */}
                {loading === true ? (

                    <div className="project-modal-loading">

                        <Spinner
                            animation="border"
                            className="project-modal-spinner"
                        />

                        <div>
                            멤버 정보를 불러오는 중입니다...
                        </div>

                    </div>

                ) : (

                    <ListGroup
                        variant="flush"
                        className="project-member-list"
                    >

                        {memberList.map(member => (

                            <ListGroup.Item
                                key={member.projectMemberNo}
                                className="project-modal-list-item"
                            >

                                <div className="project-member-row">

                                    {/* 사원 정보 */}
                                    <div className="project-member-info">

                                        <div className="project-member-name">
                                            {member.empName}
                                        </div>

                                        {member.projectMemberJob && (
                                            <div className="project-member-job">
                                                {member.projectMemberJob}
                                            </div>
                                        )}

                                    </div>


                                    {/* 권한 / 관리 */}
                                    <div className="project-member-actions">

                                        {/* OWNER */}
                                        {member.projectMemberRole === "owner" ? (

                                            <span className="project-role-badge owner">
                                                OWNER
                                            </span>

                                        ) : isOwner && isClosed === false ? (

                                            /* OWNER가 다른 멤버 권한 변경 */
                                            <Form.Select
                                                size="sm"
                                                className="project-member-role-select"
                                                value={member.projectMemberRole}
                                                onChange={(e) =>
                                                    changeMemberRole(
                                                        member,
                                                        e.target.value
                                                    )
                                                }
                                            >

                                                <option value="manager">
                                                    MANAGER
                                                </option>

                                                <option value="member">
                                                    MEMBER
                                                </option>

                                            </Form.Select>

                                        ) : (

                                            /* 일반 사용자는 보기만 */
                                            <span
                                                className={
                                                    member.projectMemberRole === "manager"
                                                        ? "project-role-badge manager"
                                                        : "project-role-badge member"
                                                }
                                            >
                                                {member.projectMemberRole.toUpperCase()}
                                            </span>

                                        )}


                                        {/* OWNER 위임 */}
                                        {isOwner &&
                                            isClosed === false &&
                                            member.projectMemberRole !== "owner" && (

                                            <Button
                                                size="sm"
                                                className="project-owner-transfer-button"
                                                onClick={() =>
                                                    changeOwner(member)
                                                }
                                            >
                                                OWNER 위임
                                            </Button>

                                        )}


                                        {/* 강제퇴장 */}
                                        {isOwner &&
                                            isClosed === false &&
                                            member.projectMemberRole !== "owner" && (

                                            <Button
                                                size="sm"
                                                className="project-kick-button"
                                                onClick={() =>
                                                    kickMember(member)
                                                }
                                            >
                                                강제퇴장
                                            </Button>

                                        )}

                                    </div>

                                </div>

                            </ListGroup.Item>

                        ))}

                    </ListGroup>

                )}

            </Modal.Body>


            {/* 하단 */}
            <Modal.Footer className="project-modal-footer">

                {/* 멤버 초대 */}
                {canInvite && isClosed === false && (

                    <Button
                        className="project-primary-button"
                        onClick={() => {
                            toast.info("아직안됌");
                        }}
                    >
                        멤버 초대
                    </Button>

                )}


                {/* 프로젝트 탈퇴 */}
                {isClosed === false && (

                    <Button
                        className="project-leave-button"
                        onClick={leaveProject}
                    >
                        프로젝트 탈퇴
                    </Button>

                )}

            </Modal.Footer>

        </Modal>
    );
}