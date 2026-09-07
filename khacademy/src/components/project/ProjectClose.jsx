import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom"
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { Badge, Button, Col, Form, ListGroup, Row, Spinner } from "react-bootstrap";

export default function ProjectClose(){

    const {projectNo} = useParams();
    const navigate = useNavigate();

    //ProjectLayout에서 전달받은 프로젝트 정보
    const {project,loadProject} = useOutletContext();
    
    //예상 결과 목록
    const [resultList,setResultList] = useState([]);

    //종료 정보
    const [close,setClose] = useState({
        closeSummary : "",
        closeGood : "",
        closeBad : "",
        closeImprovement : ""
    });

    //로딩
    const [loading, setLoading] = useState(true);

    //종료 정보 입력
    const changeCloseValue = useCallback((e)=>{
        const{ name, value } = e.target;

        setClose(prev=>({
            ...prev,
            [name] : value
        }));
    },[])

    //예상 결과 목록 조회
    const loadResultList = useCallback(async()=>{
        try{
            setLoading(true);
            const {data} = await apiClient.get(`/project/${projectNo}/result`);

            setResultList(data);
        }

        catch(e){
            toast.error("프로젝트 예상 결과를 불러오지 못했습니다.");
        }

        finally{
            setLoading(false);
        }
    },[projectNo]);

    //첫화면
    useEffect(()=>{
        //owner가 아닌 경우
        if(project.projectMemberRole !== "owner"){
            toast.warning("프로젝트 종료 권한이 없습니다.");

            navigate(`/projects/${projectNo}/task`);

            return;
        }

        loadResultList();
    },[project,projectNo,navigate,loadResultList]);

    //예상 결과 상태 변경
    const changeResultStatus = useCallback(
        (projectResultNo,status)=>{

            setResultList(prev=>
                prev.map(result =>{
                    
                    if(result.projectResultNo === projectResultNo){
                        return {
                            ...result,
                            projectResultStatus : status
                        };
                    }

                    return result;
                })
            );
    },[]);

    //종료 기능 여부
    const valid = useMemo(()=>{

        //종료 요약 필수
        if(close.closeSummary.trim().length ===0){
            return false;
        }

        return true;
    },[close.closeSummary]);

    //프로젝트 종료
    const closeProject = useCallback(async()=>{
        //종료 요약 검사
        if(close.closeSummary.trim().length === 0){
            toast.warning("프로젝트 종료 요약을 작성해주세요.");

            return;
        }

        const result = await Swal.fire({
            icon : "warning",
            title : "프로젝트를 종료하시겠습니까?",
            text : "종료된 프로젝트는 아카이브로 이동합니다.",
            showCancelButton : true,
            confirmButtonText : "종료",
            cancelButtonText : "취소"
        });

        if(result.isConfirmed === false){
            return;
        }

        //서버로 보낼 예상 결과
        const closeResultList = resultList.map(result =>({
            projectResultNo : result.projectResultNo,
            
            projectResultStatus : result.projectResultStatus
        }));

        const requestData = {
            closeSummary : close.closeSummary.trim(),

            closeGood : close.closeGood.trim(),

            closeBad : close.closeBad.trim(),

            closeImprovement : close.closeImprovement.trim(),

            resultList : closeResultList
        };

        try{
            await apiClient.patch(`/project/${projectNo}/close`,requestData);

            toast.success("프로젝트가 종료되었습니다.");

            //아카이브러 이동
            navigate("/projects/archive");
        }

        catch(e){
            toast.error("프로젝트 종료에 실패했습니다.");
        }

    },[close,resultList,projectNo,navigate]);

    //로딩화면
    if(loading === true){
        return(
            <div className="text-center mt-5">
                <Spinner animation="border"/>

                <div className=" mt-2">
                    프로젝트 정보를 불러오는 중입니다.
                </div>
            </div>
        );
    }

    //view
    return(<>
        <div className="mt-4">
            <h4>프로젝트 종료</h4>

            <div className="text-muted mb-4">
                프로젝트 결과 평가하고 종료 내용을 작성해주세요.
            </div>

            {/* 예상 결과 */}
            <Row className="mb-4">
                <Col>
                    <h5>예상 결과 평가</h5>
                    {resultList.length === 0 ? (
                        <div className="text-muted">
                            등록된 예상 결과가 없습니다.
                        </div>
                    ):(
                        <ListGroup>

                                {resultList.map(result => (

                                    <ListGroup.Item
                                        key={result.projectResultNo}
                                    >

                                        <div className=
                                            "d-flex justify-content-between align-items-center"
                                        >

                                            {/* 예상 결과 내용 */}
                                            <div>
                                                {
                                                    result.projectResultContent
                                                }
                                            </div>


                                            {/* 달성 / 미달성 */}
                                            <div className=
                                                "d-flex gap-2"
                                            >

                                                <Button
                                                    size="sm"
                                                    variant={
                                                        result.projectResultStatus
                                                        === "achieved"
                                                            ? "success"
                                                            : "outline-success"
                                                    }
                                                    onClick={() =>
                                                        changeResultStatus(
                                                            result.projectResultNo,
                                                            "achieved"
                                                        )
                                                    }
                                                >
                                                    달성
                                                </Button>


                                                <Button
                                                    size="sm"
                                                    variant={
                                                        result.projectResultStatus
                                                        === "unachieved"
                                                            ? "danger"
                                                            : "outline-danger"
                                                    }
                                                    onClick={() =>
                                                        changeResultStatus(
                                                            result.projectResultNo,
                                                            "unachieved"
                                                        )
                                                    }
                                                >
                                                    미달성
                                                </Button>

                                            </div>

                                        </div>

                                    </ListGroup.Item>

                                ))}

                            </ListGroup>

                        )}
                </Col>
            </Row>

            {/* 종료 요약 */}
            <Row className="mt-4">
                <Form.Label column sm={3}>
                    프로젝트 종료 요약
                    
                    <Badge bg="danger" className="ms-2">
                        필수
                    </Badge>
                </Form.Label>

                <Col sm={9}>
                    <Form.Control
                        as="textarea" rows={4} name="closeSummary"
                        value={close.closeSummary} onChange={changeCloseValue}
                        placeholder="프로젝트 종료 내용 요약해주세요"/>

                </Col>
            </Row>

            {/* 잘한 점 */}
            <Row className="mt-4">
                <Form.Label column sm={3}>
                    잘한 점
                </Form.Label>

                <Col sm={9}>
                    <Form.Control
                        as="textarea" rows={3} name="closeGood"
                        value={close.closeGood} onChange={changeCloseValue}
                        placeholder="프로젝트에서 잘한 점을 작성해주세요."/>
                </Col>
            </Row>

            {/* 아쉬운 점 */}
            <Row className="mt-4">
                <Form.Label column sm={3}>
                    아쉬운 점
                </Form.Label>

                <Col sm={9}>
                    <Form.Control
                        as="textarea" rows={3} name="closeBad"
                        value={close.closeBad} onChange={changeCloseValue}
                        placeholder="프로젝트에서 아쉬웠던 점을 작성해주세요."/>
                </Col>
            </Row>

            {/* 개선할 점 */}
            <Row className="mt-4">
                <Form.Label column sm={3}>
                    개선할 점
                </Form.Label>

                <Col sm={9}>
                    <Form.Control
                        as="textarea" rows={3} name="closeImprovement"
                        value={close.closeImprovement} onChange={changeCloseValue}
                        placeholder="프로젝트에서 개선할 점을 작성해주세요."/>
                </Col>
            </Row>

            {/* 종료 버튼 */}
            <Row className="mt-5 mb-5">

                <Col>
                    <Button variant="danger" disabled={valid === false}
                        className="w-100" onClick={closeProject}>
                            프로젝트 종료
                    </Button>
                </Col>
            </Row>
        </div>
    </>)
}