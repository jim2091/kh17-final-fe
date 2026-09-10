import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../utils/reaxios";
import { toast } from "react-toastify";
import { Badge, Button, Dropdown } from "react-bootstrap";
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

            {/* 왼쪽 - 프로젝트 정보 */}
            <div className="project-header-main">

                <div className="project-header-title-row">

                    <div className="project-title">
                        {project.projectName}
                    </div>

                    <span
                        className={
                            project.projectVisibility === "public"
                                ? "project-visibility public"
                                : "project-visibility private"
                        }
                    >
                        {project.projectVisibility === "public"
                            ? "공개"
                            : "비공개"
                        }
                    </span>

                    {/* 프로젝트 상태 */}
                    <span
                        className={
                            isActive
                                ? "project-header-status active"
                                : "project-header-status closed"
                        }
                    >
                        {isActive
                            ? "진행중"
                            : "종료"
                        }
                    </span>


                    {/* 프로젝트 권한 */}
                    <span className="project-header-role">
                        {project.projectMemberRole
                            ?.toUpperCase()}
                    </span>

                </div>


                <div className="project-description">
                    {project.projectPurpose}
                </div>

            </div>


            {/* 오른쪽 - 관리 영역 */}
            <div className="project-header-info">
                    
                {/* 기능 버튼 */}
                <div className="project-header-actions">

                    <Button
                        size="sm"
                        className="project-header-button"
                        onClick={() =>
                            setShowResult(true)
                        }
                    >
                        기대결과
                    </Button>

                    <Button
                        size="sm"
                        className="project-header-button"
                        onClick={() =>
                            setShowMember(true)
                        }
                    >
                        멤버관리
                    </Button>

                </div>

                {/* active OWNER 관리 */}
                {isActive && isOwner && (

                    <Dropdown align="end">

                        <Dropdown.Toggle
                            size="sm"
                            className="project-manage-dropdown"
                        >
                            프로젝트 관리
                        </Dropdown.Toggle>

                        <Dropdown.Menu
                            className="project-manage-menu"
                        >

                            <Dropdown.Item
                                onClick={moveEdit}
                            >
                                프로젝트 수정
                            </Dropdown.Item>

                            <Dropdown.Item
                                onClick={moveClose}
                            >
                                프로젝트 종료
                            </Dropdown.Item>

                            <Dropdown.Divider/>

                            <Dropdown.Item
                                className="project-manage-delete"
                                onClick={deleteProject}
                            >
                                프로젝트 삭제
                            </Dropdown.Item>

                        </Dropdown.Menu>

                    </Dropdown>

                )}


                {/* closed OWNER */}
                {isClosed && isOwner && (

                    <Button
                        size="sm"
                        className="project-primary-button project-activate-button"
                        onClick={activateProject}
                    >
                        프로젝트 활성화
                    </Button>

                )}

            </div>


            {/* 멤버 모달 */}
            <ProjectMemberModal
                show={showMember}
                onHide={() =>
                    setShowMember(false)
                }
                projectNo={projectNo}
                project={project}
                loadProject={loadProject}
            />


            {/* 기대결과 모달 */}
            <ProjectExpectedResultModal
                show={showResult}
                onHide={() =>
                    setShowResult(false)
                }
                projectNo={projectNo}
                project={project}
            />

        </div>
    );
}