import { useNavigate, useParams } from "react-router-dom";

import "./Project.css";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../utils/reaxios";
import { toast } from "react-toastify";
import { Badge, Button, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import ProjectMemberModal from "../components/project/ProjectMemberModal";

export default function ProjectHeader({project, loadProject}) {
    //프로젝트 번호
    const { projectNo } = useParams();
                    
    //페이지 이동
    const navigate = useNavigate();

    //멤버 관리
    const [showMember, setShowMember] = useState(false);

    //프로젝트 수정페이지 이동
    const moveEdit = useCallback(()=>{
        navigate(`/projects/${projectNo}/edit`);
    },[projectNo])

    //프로젝트 종료페이지 이동
    const moveClose = useCallback(()=>{
        navigate(`/projects/${projectNo}/close`);
    })

    //프로젝트 삭제
    const deleteProject = useCallback(async()=>{
        const result = await Swal.fire({
            icon:"warning",
            title:"프로젝트를 삭제하시겠습니까?",
            text: "삭제된 프로젝트는 복구할 수 없습니다.",
            showCancelButton : true,
            confirmButtonText : "삭제",
            cancelButtonText : "취소"
        });

        if(result.isConfirmed === false) return;

        try{
            await apiClient.delete(`/project/${projectNo}`);
            
            toast.success("프로젝트가 삭제되었습니다.");

            navigate("/projects");
        }

        catch(e){
            console.error(e);

            toast.error("프로젝트 삭제에 실패했습니다.");
        }
    },[projectNo])

    return (
        <div className="project-header">

            {/* 프로젝트 기본 정보 */}
            <div className="project-header-main">

                <div className="d-flex align-items-center">
                    {/* 프로젝트 제목 */}
                    <div className="project-title">
                        {project.projectName}
                    </div>

                    {/* 프로젝트 공개범위 */}
                    <Badge
                        bg={project.projectVisibility === "public" ? "info" : "secondary"}>
                            {project.projectVisibility === "public" ? "공개" : "비공개"}
                    </Badge>
                </div>
                
                    {/* 프로젝트 설명 */}
                    <div className="project-description">
                        {project.projectPurpose}                    
                    </div>
            </div>

            {/* 오른쪽 영역 */}
            <div className="project-header-info">
                <Button size="sm" variant="outline-secondary"
                        onClick={()=> setShowMember(true)}>
                        멤버관리
                </Button>
                <ProjectMemberModal 
                    show={showMember}
                    onHide={()=>setShowMember(false)}
                    projectNo={projectNo}
                    project = {project}
                    loadProject = {loadProject}
                />
                {/* 상태 */}
                <Badge
                    bg={project.projectStatus === "active" ? "success" : "secondary"}>
                        {project.projectStatus === "active" ? "진행중" : "종료"}
                </Badge>

                {/* 현재 사용자의 프로젝트 권한 */}
                <Badge bg="primary">
                    {project.projectMemberRole}
                </Badge>

                {/* owner 전용 */}
                {project.projectMemberRole === "owner" &&(
                    <div className="d-flex me-2">
                        <Button size="sm" variant="outline-primary" onClick={moveEdit}>수정</Button>
                        <Button size="sm" variant="outline-warning" onClick={moveClose}>종료</Button>
                        <Button size="sm" variant="outline-danger" onClick={deleteProject}>삭제</Button>
                    </div>
                )}
            </div>

        </div>
    );
}