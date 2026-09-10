import { useCallback, useEffect, useState } from "react"
import { Badge, Card, Col, Row, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";

export default function MyProjectList() {
    //프로젝트 목록
    const [projectList, setProjectList] = useState([]);
    //로딩상태
    const [loading , setLoading] = useState(true);
    //페이지 이동
    const navigate = useNavigate();

    //내 프로젝트 목록 조회
    const loadProjectList = useCallback(async ()=>{
        try{
            setLoading(true);
            
            const {data} = await apiClient.get("/project/my");

            setProjectList(data);
        }
        catch(e){
            console.error(e);
            toast.error("프로젝트 목록을 불러오지 못했습니다.");
        }
        finally{
            setLoading(false);
        }
    },[]);

    //첫 화면 실행
    useEffect(()=>{
        loadProjectList();
    },[])

    //날짜 출력
    const formatDate = (date) => {
        if(!date) return "-";

        return new Date(date).toLocaleDateString("ko-KR");
    };

    //프로젝트 이동
    const moveProject = useCallback((projectNo)=>{
        navigate(`/projects/${projectNo}/task`);
    },[]);

    //로딩중
    if(loading === true){
        return(
            <div className="text-center mt-5">
                <Spinner animation="border"/>
                <div className="mt-2">
                    프로젝트를 불러오는 중입니다...
                </div>
            </div>
        )
    }
    return (
        <div className="project-page">

            {/* 페이지 제목 */}
            <div className="project-page-header mt-4 mb-4">

                <div className="ms-3">
                    <h3 className="project-page-title">
                        내 프로젝트
                    </h3>
                </div>

                {/* 프로젝트 개수 */}
                <div className="project-page-count ms-3">
                    참여 프로젝트
                    <strong>
                        {projectList.length}
                    </strong>
                    개
                </div>

            </div>


            {/* 프로젝트가 없는 경우 */}
            {projectList.length === 0 ? (

                <div className="my-project-empty">

                    <div className="my-project-empty-title">
                        참여 중인 프로젝트가 없습니다.
                    </div>

                    <div className="my-project-empty-description">
                        공개 프로젝트에 참여하거나 새로운 프로젝트를 만들어보세요.
                    </div>

                </div>

            ) : (

                /* 프로젝트 목록 */
                <Row>

                    {projectList.map(project => (

                        <Col
                            key={project.projectNo}
                            xs={12}
                            md={6}
                            xl={4}
                            className="mb-4"
                        >

                            <Card
                                className="h-100 my-project-card"
                                onClick={() =>
                                    moveProject(project.projectNo)
                                }
                            >

                                <Card.Body className="my-project-card-body">

                                    {/* 상단 */}
                                    <div className="my-project-card-header">

                                        {/* 프로젝트명 */}
                                        <Card.Title className="my-project-title">
                                            {project.projectName}
                                        </Card.Title>


                                        {/* 프로젝트 권한 */}
                                        <span
                                            className={
                                                `my-project-role ${project.projectMemberRole}`
                                            }
                                        >
                                            {project.projectMemberRole?.toUpperCase()}
                                        </span>

                                    </div>


                                    {/* 프로젝트 목적 */}
                                    <Card.Text className="my-project-purpose">
                                        {project.projectPurpose}
                                    </Card.Text>


                                    {/* 공개 범위 */}
                                    <div className="my-project-meta">

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


                                    {/* 프로젝트 기간 */}
                                    <div className="my-project-period">

                                        <div className="my-project-period-row">
                                            <span>
                                                시작일
                                            </span>

                                            <strong>
                                                {formatDate(project.projectStart)}
                                            </strong>
                                        </div>

                                        <div className="my-project-period-row">
                                            <span>
                                                마감일
                                            </span>

                                            <strong>
                                                {formatDate(project.projectDeadline)}
                                            </strong>
                                        </div>

                                    </div>

                                </Card.Body>

                            </Card>

                        </Col>

                    ))}

                </Row>

            )}

        </div>
    );
}