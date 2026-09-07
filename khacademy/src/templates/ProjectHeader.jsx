import { useNavigate, useParams } from "react-router-dom";

import "./Project.css";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../utils/reaxios";
import { toast } from "react-toastify";
import { Badge, Button, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import ProjectMemberModal from "../components/project/ProjectMemberModal";
import ProjectExpectedResultModal from "../components/project/ProjectExpectedResultModal";

export default function ProjectHeader({project, loadProject}) {
    //프로젝트 번호
    const { projectNo } = useParams();
                    
    //페이지 이동
    const navigate = useNavigate();

    //기대결과 모달
    const [showResult,setShowResult] = useState(false);

    //멤버 관리
    const [showMember, setShowMember] = useState(false);

    //상태 구분
    const isActive = project.projectStatus === "active";
    const isClosed = project.projectStatus === "closed";
    const isOwner = project.projectMemberRole === "owner";

    //프로젝트 수정페이지 이동
    const moveEdit = useCallback(()=>{
        navigate(`/projects/${projectNo}/edit`);
    },[projectNo,navigate])

    //프로젝트 종료페이지 이동
    const moveClose = useCallback(()=>{
        navigate(`/projects/${projectNo}/close`);
    },[projectNo,navigate])

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

            navigate("/projects/my");
        }

        catch(e){
            console.error(e);

            toast.error("프로젝트 삭제에 실패했습니다.");
        }
    },[projectNo,navigate])

    //프로젝트 재활성화
    const activateProject = useCallback(async()=>{

        const result = await Swal.fire({
            icon : "question",
            title : "프로젝트를 다시 시작하시겠습니까?",
            text : "프로젝트가 활성화되어 다시 작업할 수 있습니다.",
            showCancelButton : true,
            confirmButtonText : "활성화",
            cancelButtonText : "취소"
        });

        if(result.isConfirmed === false){
            return;
        }

        try{
            await apiClient.patch(`/project/${projectNo}/activate`);
            toast.success("프로젝트가 다시 활성화되었습니다.");
            //프로젝트 정보 다시 조회
            await loadProject();
    
            //업무 화면으로 이동
            navigate(`/projects/${projectNo}/task`);
        }

        catch(e){
            toast.error("프로젝트 활성화에 실패했습니다.");
        }

    },[projectNo,loadProject,navigate]);

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
                        onClick={()=> setShowResult(true)}>
                        기대결과
                </Button>

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
                <ProjectExpectedResultModal 
                    show={showResult} 
                    onHide={()=>setShowResult(false)}
                    projectNo={projectNo} 
                    project={project}
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

                {/* active 프로젝트 owner */}
                {isActive && isOwner && (
                    <div className="d-flex me-2 gap-1">
                        <Button size="sm" variant="outline-primary"
                                onClick={moveEdit}>
                            수정
                        </Button>

                        <Button size="sm" variant="outline-warning"
                                onClick={moveClose}>
                            종료
                        </Button>

                        <Button size="sm" variant="outline-danger"
                                onClick={deleteProject}>
                            삭제
                        </Button>
                    </div>
                )}
                {/* closed 프로젝트 owner */}
                {isClosed && isOwner && (
                    <Button size="sm" variant="success"
                            onClick={activateProject}>
                        프로젝트 활성화
                    </Button>
                )}
            </div>

        </div>
    );
}