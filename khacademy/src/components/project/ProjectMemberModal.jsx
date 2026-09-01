import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { Badge, Button, Form, ListGroup, Modal, Spinner } from "react-bootstrap";

export default function ProjectMemberModal({
    show,onHide,projectNo,project
}){
    //프로젝트 멤버 목록
    const [memberList,setMemberList] = useState([]);

    //현재 로그인 사용자의 프로젝트 권한
    const role = project.projectMemberRole;

    //owner여부
    const isOwner = role === "owner";

    //맴버 초대 가능 여부
    const canInvite = project.projectVisibility === "public" || 
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
    return(
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    프로젝트 멤버
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* 인원수 */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="text-muted">
                        현재 참여 인원
                    </div>

                    <Badge bg="primary">
                        {memberList.length}명
                    </Badge>
                </div>

                {/* 로딩 */}
                {loading === true ? (
                    <div className="text-center py-5">
                        <Spinner animation="border"/>
                        <div className="mt-2">
                            멤버 정보를 불러오는 중입니다...
                        </div>
                    </div>
                ) : (
                    <ListGroup variant="flush">
                        {memberList.map(member => (
                            <ListGroup.Item key={member.projectMemberNo}>
                                <div className="d-flex justify-content-between align-items-center">
                                    {/* 사원 정보 */}
                                    <div>
                                        <div className="fw-bold">
                                            {member.empName}
                                        </div>

                                        {member.projectMemberJob &&(
                                            <div className="small text-muted mt-1">
                                                {member.projectMemberJob}
                                            </div>
                                        )}
                                    </div>
                                    {/* 권한 */}
                                    <div>
                                        {/* owner */}
                                        {member.projectMemberRole === "owner" ? (
                                            <Badge bg="primary">
                                                OWNER
                                            </Badge>
                                        ) : isOwner ? (
                                            <Form.Select size="sm"
                                                value={member.projectMemberRole}
                                                onChange ={(e)=> changeMemberRole(member,e.target.value)}>

                                                    <option value="manager">
                                                        MANAGER
                                                    </option>

                                                    <option value="member">
                                                        MEMBER
                                                    </option>
                                            </Form.Select>
                                        ) :(
                                           <Badge bg={member.projectMemberRole === "manager" ? "success" : "secondary"}>
                                                {member.projectMemberRole.toUpperCase()}
                                           </Badge>
                                        )}
                                    </div>
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                )}
            </Modal.Body>

            <Modal.Footer>
                {/* OWㅜ */}
                {canInvite && (
                    <Button variant="primary"
                        onClick={()=>{
                            toast.info("아직안됌")
                        }}>
                        멤버 초대
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}