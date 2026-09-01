import { useCallback, useEffect, useState } from "react"
import { Badge, Button, Col, Form, ListGroup, Pagination, Row, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
import Swal from "sweetalert2"

export default function PublicProjectList() {

    //공개 프로젝트 목록
    const [projectList,setProjectList] = useState([]);

    //페이지 정보
    const [pageVO,setPageVO] = useState({
        keyword : "",
        page : 1,
        count : 0,
        pageCount : 0,
        beginBlock : 1,
        endBlock : 1
    });

    //검색창에 입력중인 값
    const [keyword,setKeyword] = useState("");

    //실제로 서버에 전송할 검색어
    const [searchKeyword,setSearchKeyword] = useState("");

    //현재 페이지
    const [page,setPage] = useState(1);

    //로딩
    const [loading, setLoading] = useState(true);
    //페이지 이동
    const navigate = useNavigate();

    //공개 프로젝트 목록 조회
    const loadProjectList = useCallback(async ()=>{

        try{
            setLoading(true);

            const{data} = await apiClient.get(
                "/project/public",
                {
                    params:{
                        page : page,
                        keyword : searchKeyword
                    }
                }
            );
            setProjectList(data.projectList);
            setPageVO(data.pageVO);
        }
        catch(e) {
            toast.error(
                "공개 프로젝트 목록을 불러오지 못했습니다."
            );            
        }
        finally{
            setLoading(false);
        }
        
    },[page,searchKeyword]);

    //변경시 조회(첫화면도)
    useEffect(()=>{
        loadProjectList();
    },[loadProjectList])
    
    //검색
    const searchProject = useCallback(()=>{
        //검색하면 무조건 1페이지
        setPage(1);
        //실제 검색어 적용
        setSearchKeyword(keyword.trim());   
    },[keyword]);

    //검색창 엔터
    const searchEnter = useCallback(()=>{
        if(e.key === "Enter"){
            searchProject();
        }
    },[searchProject]);

    //날짜 출력
    const formatDate = ((date) =>{
        if(!date) return "-";

        return new Date(date).toLocaleDateString("ko-KR");
    });

    //프로젝트 클릭
    const openProject = useCallback(async(project) =>{
        //이미 프로젝트 참여중인지 확인
        const joined = project.projectMemberRole !== null;

        //확인창
        const result = await Swal.fire({
            title:project.projectName,
            text : joined
                ? "이미 참여중인 프로젝트입니다."
                : "이 프로젝트에 참가하시겠습니까?",
            icon : "info",
            showCancelButton : true,
            confirmButtonText:
                joined ? "프로젝트 들어가기" : "참가하기",
            cancelButtonText:"닫기",
            confirmButtonColor:"#11a7fd",
            cancelButtonColor:"#d63031"
        });
        if(result.isConfirmed === false) return;

        //이미참여중인 프로젝트
        if(joined){
            navigate(`/projects/${project.projectNo}/task`);
            return;
        }
        try{
            await apiClient.post(`/project/${project.projectNo}/join`)
            
            toast.success("프로젝트에 참가했습니다.");

            navigate(`/projects/${project.projectNo}/task`);
        }
        catch(e){
            toast.error("프로젝트 참가에 실패했습니다.");
        }
    },[navigate,loadProjectList])

    //페이지 번호 생성
    const pageNumbers = [];
    for(let i = pageVO.beginBlock; i <= pageVO.endBlock; i++){
        pageNumbers.push(i);
    }

    //로딩
    if(loading === true){
        return(
            <div className="text-center mt-5">
                <Spinner animation="border"/>
                <div className="mt-2">
                    프로젝트를 불러오는 중입니다...
                </div>
            </div>
        );
    }
    
    return (<>

        {/* 제목 */}
        <Row className="mt-4 mb-4">
            <Col>
                <h3 className="fw-bold">
                    공개 프로젝트
                </h3>

                <div className="text-muted">
                    회사 구성원에게 공개된 프로젝트입니다.
                </div>
            </Col>

            <Col className="text-end">
                <span className="text-muted">
                    전체
                </span>
                <div className="ms-2">
                    {pageVO.count}개
                </div>
            </Col>
        </Row>

        {/* 검색 */}
        <Row className="mb-4">
            <Col md={8} lg={6}>
                <div className="d-flex ms-2">
                    <Form.Control type="text" value={keyword}
                        placeholder="프로젝트명 또는 목적검색"
                        onChange={(e)=> setKeyword(e.target.value)} 
                        onKeyDown={searchEnter}/>

                    <Button variant="primary" onClick={searchProject}>
                        검색
                    </Button>
                </div>

            </Col>
        </Row>

        {/* 항목 */}
        <Row className="fw-bold border-top border-bottom py-3 bg-light">
            <Col md={3}>
                프로젝트 명
            </Col>
            <Col md={4}>
                프로젝트 목적
            </Col>
            <Col md={3}>
                프로젝트 기간
            </Col>
            <Col md={2}>
                프로젝트 참여상태
            </Col>

        </Row>

        {/* 프로젝트 없음 */}
        {projectList.length === 0 ? (
            <div className="text-center text-muted py-5">

                {searchKeyword !== ""
                    ? "검색된 프로젝트가 없습니다."
                    : "공개 프로젝트가 없습니다."}
            </div>
        ):(
            <ListGroup variant="flush">
                {projectList.map(project=>(
                    <ListGroup.Item
                        key={project.projectNo}
                        onClick={()=> openProject(project)}
                        className="py-3">
                            
                            <Row className="align-items-center">
                                {/* 프로젝트명 */}
                                <Col md={3}>
                                    <div className="fw-bold">
                                        {project.projectName}
                                    </div>
                                </Col>
                                {/* 목적 */}
                                <Col md={4}>
                                    <div className="text-muted">
                                        {project.projectPurpose}
                                    </div>
                                </Col>
                                {/* 기간 */}
                                <Col md={3}>
                                    <div className="small text-muted">
                                        {formatDate(project.projectStart)}
                                        {"~"}
                                        {formatDate(project.projectDeadline)}
                                    </div>
                                </Col>

                                {/* 참여상태 */}
                                <Col md={2} className="text-center">
                                    {project.projectMemberRole !== null ? 
                                    (
                                        <Badge bg="success">
                                            참여중
                                        </Badge>
                                    ):(
                                        <Badge bg="secondary">
                                            참여 가능
                                        </Badge>
                                    )}
                                </Col>
                            </Row>
                        </ListGroup.Item>
                ))}
            </ListGroup>
        )}

        {/* 페이지네이션 */}
        {pageVO.pageCount > 0 &&(
            <div className="d-flex justify-content-center mt-4">
                <Pagination>
                    {/* 이전블록 */}
                    <Pagination.Prev 
                        disabled={pageVO.beginBlock <=1}
                        onClick={()=> setPage(pageVO.beginBlock -1)}/>
                    {/* 페이지 번호 */}
                    {pageNumbers.map(number=>(
                        <Pagination.Item key={number}
                            active={ number === pageVO.page}
                            onClick={()=> setPage(number)}>
                                {number}
                            </Pagination.Item>
                    ))}
                    {/* 다음블록 */}
                    <Pagination.Next
                        disabled={pageVO.endBlock >= pageVO.pageCount}
                        onClick={()=> setPage(pageVO.endBlock +1)}/>
                </Pagination>
            </div>
        )}
    </>)
}