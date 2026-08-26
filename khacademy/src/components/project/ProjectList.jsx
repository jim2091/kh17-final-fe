import { useCallback, useEffect, useState } from "react"
import { Badge, Card, Col, Row, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
// import "../Project.css";

export default function ProjectList() {
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
            
            const response = await apiClient.get("/project/my");

            ("프로젝트 목록 응답 =", response.data)
            setProjectList(response.data);
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
    return (<>
       
       {/* 제목 */}
       <Row className="mt-4 mb-4">
            <Col>
                <h3 className="fw-bold">
                    내 프로젝트
                </h3>
            </Col>
            
            <div className="text-muted">
                현재 참여하고 있는 프로젝트입니다.
            </div>
       </Row>

       {/* 프로젝트가 없는 경우 */}
       {projectList.length === 0 && (
            <Row>
                <Col>
                    <div className="text-center text-muted py-5">

                        <h5>
                            참여 중인 프로젝트가 없습니다.
                        </h5>
                    </div>
                </Col>
            </Row>
       )}

       {/* 프로젝트 목록 */}
       <Row>
        {projectList.map(project =>(
            <Col key={project.projectNo} xs={12} md={6}
                    xl={4} className="mb-4">
                <Card className="h-100 project-card"
                    onClick={()=> moveProject(project.projectNo)}
                    style={{cursor:"pointer"}}>

                    <Card.Body>
                        {/* 프로젝트 제목 */}
                        <div className="d-flex justify-content-between align-item-start">
                            <Card.Title className="fw-bold">
                                {project.projectName}
                            </Card.Title>

                            {/* 권한 */}
                            <Badge
                                bg={{
                                    owner: "primary",
                                    manager: "success",
                                    member: "secondary"
                                }[project.projectMemberRole]}
                            >
                                {project.projectMemberRole}
                            </Badge>
                        </div>

                        {/* 프로젝트 목적 */}
                        <Card.Text className="text-muted mt-3">
                            {project.projectPurpose}
                        </Card.Text>

                        {/* 공개범위 */}
                        <div className="mt-3">

                            <Badge
                                bg={project.projectVisibility === "public" ? "info" : "secondary"}>
                                    {project.projectVisibility === "public" ? "공개" : "비공개"}
                            </Badge>
                        </div>

                        {/* 프로젝트 기간 */}
                        <div className="mt-3 small text-muted">
                            <div>
                                시작일 : {formatDate(project.projectStart)}
                            </div>

                            <div>
                                마감일 : {formatDate(project.projectDeadline)}
                            </div>
                        </div>

                    </Card.Body>
                </Card>
            
            </Col>
        ))}
       </Row>
    </>)
}