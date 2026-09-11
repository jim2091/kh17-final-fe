import { useCallback, useEffect, useState } from "react"
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
import { Badge, ListGroup, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function ArcheiveProjectList() {

    //아카이브 프로젝트 목록
    const [projectList,setProjectList] = useState([]);

    //로딩
    const[loading,setLoading] = useState(true);

    const navigate = useNavigate();

    //아카이브 프로젝트 목록 조회
    const loadProjectList = useCallback(async() =>{
        try{
            setLoading(true);

            const {data} = await apiClient.get("/project/archive");

            setProjectList(data);
        }
        catch(e){
            toast.error("아카이브 프로젝트 목록을 불러오지 못했습니다.");
        }
        finally{
            setLoading(false);
        }
    },[])

    //첫 화면
    useEffect(()=>{
        loadProjectList();
    },[loadProjectList]);

    //날짜 변환
    const formatDate = useCallback((date)=>{
        if(!date){
            return "-";
        }
        return new Date(date).toLocaleDateString("ko-KR");
    },[])

    //로딩화면
    if(loading === true){
        return(
            <div className="text-center mt-5">
                <Spinner animation="border"/>
                
                <div className="mt-2">
                    아카이브 프로젝트를 불러오는 중입니다...
                </div>
            </div>
        );
    }
    return (
        <div className="project-page archive-project-page">

            {/* 제목 */}
            <div className="project-page-header mt-4 mb-4">

                <div>
                    <h3 className="project-page-title">
                        프로젝트 아카이브
                    </h3>

                    <p className="project-page-description">
                        종료된 프로젝트 목록입니다.
                    </p>
                </div>

                <div className="project-page-count">
                    전체
                    <strong>
                        {projectList.length}
                    </strong>
                    개
                </div>

            </div>


            {/* 프로젝트가 없는 경우 */}
            {projectList.length === 0 ? (

                <div className="archive-project-empty">

                    <div className="archive-project-empty-title">
                        종료된 프로젝트가 없습니다.
                    </div>

                    <div className="archive-project-empty-description">
                        종료된 프로젝트가 생기면 이곳에서 다시 확인할 수 있습니다.
                    </div>

                </div>

            ) : (

                <div className="archive-project-panel">

                    {/* 목록 헤더 */}
                    <div className="archive-project-list-header">

                        <div>
                            프로젝트
                        </div>

                        <div>
                            프로젝트 목적
                        </div>

                        <div>
                            프로젝트 기간
                        </div>

                        <div className="text-center">
                            상태
                        </div>

                        <div className="text-center">
                            내 역할
                        </div>

                    </div>


                    {/* 목록 */}
                    <ListGroup variant="flush">

                        {projectList.map(project => (

                            <ListGroup.Item
                                key={project.projectNo}
                                action
                                className="archive-project-list-item"
                                onClick={() =>
                                    navigate(
                                        `/projects/${project.projectNo}/task`
                                    )
                                }
                            >

                                <div className="archive-project-row">

                                    {/* 프로젝트명 / 공개범위 */}
                                    <div className="archive-project-name-area">

                                        <div className="archive-project-name">
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

                                    </div>


                                    {/* 프로젝트 목적 */}
                                    <div className="archive-project-purpose">
                                        {project.projectPurpose}
                                    </div>


                                    {/* 기간 */}
                                    <div className="archive-project-period">

                                        {formatDate(
                                            project.projectStart
                                        )}

                                        <span>
                                            ~
                                        </span>

                                        {formatDate(
                                            project.projectDeadline
                                        )}

                                    </div>


                                    {/* 종료 상태 */}
                                    <div className="text-center">

                                        <span className="archive-project-status">
                                            종료
                                        </span>

                                    </div>


                                    {/* 내 역할 */}
                                    <div className="text-center">

                                        <span
                                            className={
                                                `archive-project-role ${project.projectMemberRole}`
                                            }
                                        >
                                            {project.projectMemberRole
                                                ?.toUpperCase()}
                                        </span>

                                    </div>

                                </div>

                            </ListGroup.Item>

                        ))}

                    </ListGroup>

                </div>

            )}

        </div>
    );
}