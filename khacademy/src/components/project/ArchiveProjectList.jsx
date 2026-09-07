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
    return (<>
        <div className="container mt-4">
            {/* 제목 */}
            <div className="mb-4">
                <h3>프로젝트 아카이브</h3>

                <div className="text-muted">
                    종료된 프로젝트 목록입니다.
                </div>
            </div>

            {/* 프로젝트가 없는 경우 */}
            {projectList.length === 0 ?(
                <div className="text-center text-muted border rounded py-5">
                    종료된 프로젝트가 없습니다.
                </div>
            ):(<>
               {/* 프로젝트 개수 */}
               <div className="mb-3">
                    총{" "}
                    <strong>
                        {projectList.length}
                    </strong>
                    개의 프로젝트
               </div>

               {/* 목록 */}
               <ListGroup>
                    {projectList.map(project =>(
                        <ListGroup.Item key={project.projectNo} action 
                            onClick={()=>navigate(`/projects/${project.projectNo}/task`)}>
                            <div className="d-flex justify-content-between align-items-center">
                                {/* 왼쪽 */}
                                <div>
                                    {/* 프로젝트명 */}
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="fw-bold">
                                            {project.projectName}
                                        </span>
                                        {/* 종료 */}
                                        <Badge bg="secondary">
                                            종료
                                        </Badge>
                                        {/* 공개범위 */}
                                        <Badge bg={
                                            project.projectVisibility
                                            === "public" ? "info" : "dark"
                                        }>
                                            {
                                                project.projectVisibility
                                                === "public" ? "공개" : "비공개"
                                            }
                                        </Badge>
                                    </div>

                                    {/* 프로젝트 목적 */}
                                    <div className="text-muted mt-2">
                                        {project.projectPurpose}
                                    </div> 

                                    {/* 기간 */}
                                    <div className="small text-muted mt-2">
                                        {formatDate(project.projectStart)}
                                        {" ~ "}
                                        {formatDate(project.projectDeadline)}
                                    </div>
                                </div>

                                {/* 오른쪽 - 내역할 */}
                                <div>
                                    <Badge bg="primary">
                                        {project.projectMemberRole?.toUpperCase()}
                                    </Badge>
                                </div>
                            </div>
                        </ListGroup.Item>
                    ))}
               </ListGroup>

            </>)}
        </div>
    </>)
}