    import { useCallback, useEffect, useMemo, useState } from "react";
    import { useNavigate, useParams } from "react-router-dom"
    import { apiClient } from "../../utils/reaxios";
    import { toast } from "react-toastify";
    import Swal from "sweetalert2";
    import { Button, Col, Form, ListGroup, Row, Spinner } from "react-bootstrap";

    export default function ProjectClose(){

        const {projectNo} = useParams();
        const navigate = useNavigate();

        //프로젝트 정보
        const [project, setProject] = useState(null);
        
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
        
        //첫화면
        useEffect(()=>{
            const loadPage = async()=>{
                try{
                    setLoading(true);
                    
                    //프로젝트 정보
                    const projectResponse = await apiClient.get(`/project/${projectNo}`);

                    const projectData = projectResponse.data;

                    //owner가 아니면 종료화면 접근 불가
                    if(projectData.projectMemberRole !== "owner"){
                        toast.warning("프로젝트 종료 권한이 없습니다.");

                        navigate(`/projects/${projectNo}/task`);
                        return;
                    }
                    setProject(projectData);

                    //기대결과 조회
                    const resultResponse = await apiClient.get(`/project/${projectNo}/result`);
    
                    setResultList(resultResponse.data);
                }



                catch(e){
                    toast.error("프로젝트 정보를 불러오지 못했습니다.");
                }
                finally{
                    setLoading(false);
                }

            }
            loadPage();
        },[projectNo,navigate]);

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

            //상태 확인
            const hasUnachieved = resultList.some(result=>
                result.projectResultStatus === "unachieved"
            );
            const hasPartial = resultList.some(result=>
                result.projectResultStatus === "partial"
            );

            let confirmResult;

            if(hasUnachieved || hasPartial){
                confirmResult = await Swal.fire({
                    icon : "warning",
                    title : "미달성된 기대결과가 있습니다",
                    html : `기대결과가 부분달성 또는 미달성 상태입니다. <br/>
                            그래도 프로젝트를 종료하시겠습니까?`,
                    showCancelButton : true,
                    confirmButtonText : "종료",
                    cancelButtonText : "취소",
                    confirmButtonColor : "#dc3545"
                });
            }
            else{
                confirmResult = await Swal.fire({
                    icon : "warning",
                    title : "프로젝트를 종료하시겠습니까?",
                    text : "종료된 프로젝트는 아카이브로 이동합니다.",
                    showCancelButton : true,
                    confirmButtonText : "종료",
                    cancelButtonText : "취소"
                });
            }

            if(!confirmResult.isConfirmed){
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
        return (
            <div className="project-page project-close-standalone">

                {/* 제목 */}
                <div className="project-page-header mt-4 mb-4">

                    <div>
                        <h3 className="project-page-title">
                            프로젝트 종료
                        </h3>

                        <p className="project-page-description">
                            프로젝트 결과를 평가하고 종료 내용을 작성해주세요.
                        </p>
                </div>

            </div>


            {/* 종료 안내 */}
            <div className="project-close-warning">
                프로젝트를 종료하면 업무, 채팅 등 프로젝트 기능이
                읽기 전용으로 변경됩니다.
            </div>


            {/* 기대결과 평가 */}
            <div className="project-form-card project-close-result-card">

                <div className="project-close-section-header">

                    <div>
                        <h5 className="project-close-section-title">
                            기대결과 평가
                        </h5>

                        <div className="project-close-section-description">
                            프로젝트 기대결과의 최종 달성 상태를 선택해주세요.
                        </div>
                    </div>

                    <span className="project-close-result-count">
                        {resultList.length}개
                    </span>

                </div>


                {resultList.length === 0 ? (

                    <div className="project-close-result-empty">
                        등록된 기대결과가 없습니다.
                    </div>

                ) : (

                    <div className="project-close-result-list">

                        {resultList.map((result, index) => (

                            <div
                                key={result.projectResultNo}
                                className="project-close-result-row"
                            >

                                {/* 기대결과 */}
                                <div className="project-close-result-content">

                                    <span className="project-close-result-order">
                                        {index + 1}
                                    </span>

                                    <span>
                                        {result.projectResultContent}
                                    </span>

                                </div>


                                {/* 상태 */}
                                <div className="project-close-result-actions">

                                    <Button
                                        size="sm"
                                        className={
                                            result.projectResultStatus === "achieved"
                                                ? "project-close-status-button achieved active"
                                                : "project-close-status-button achieved"
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
                                        className={
                                            result.projectResultStatus === "partial"
                                                ? "project-close-status-button partial active"
                                                : "project-close-status-button partial"
                                        }
                                        onClick={() =>
                                            changeResultStatus(
                                                result.projectResultNo,
                                                "partial"
                                            )
                                        }
                                    >
                                        부분달성
                                    </Button>


                                    <Button
                                        size="sm"
                                        className={
                                            result.projectResultStatus === "unachieved"
                                                ? "project-close-status-button unachieved active"
                                                : "project-close-status-button unachieved"
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

                        ))}

                    </div>

                )}

            </div>


            {/* 종료 내용 작성 */}
            <div className="project-form-card project-close-form-card">

                <div className="project-close-section-header">

                    <div>
                        <h5 className="project-close-section-title">
                            종료 내용
                        </h5>

                        <div className="project-close-section-description">
                            프로젝트 진행 결과와 회고 내용을 작성해주세요.
                        </div>
                    </div>

                </div>


                {/* 종료 요약 */}
                <Row className="project-form-group align-items-start">

                    <Form.Label
                        column
                        sm={3}
                        className="project-form-label pt-2"
                    >
                        프로젝트 종료 요약

                        <span className="project-required-badge">
                            필수
                        </span>
                    </Form.Label>

                    <Col sm={9}>

                        <Form.Control
                            as="textarea"
                            rows={4}
                            name="closeSummary"
                            value={close.closeSummary}
                            onChange={changeCloseValue}
                            placeholder="프로젝트 종료 내용을 요약해주세요."
                        />

                    </Col>

                </Row>


                {/* 잘한 점 */}
                <Row className="project-form-group align-items-start">

                    <Form.Label
                        column
                        sm={3}
                        className="project-form-label pt-2"
                    >
                        잘한 점
                    </Form.Label>

                    <Col sm={9}>

                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="closeGood"
                            value={close.closeGood}
                            onChange={changeCloseValue}
                            placeholder="프로젝트에서 잘한 점을 작성해주세요."
                        />

                    </Col>

                </Row>


                {/* 아쉬운 점 */}
                <Row className="project-form-group align-items-start">

                    <Form.Label
                        column
                        sm={3}
                        className="project-form-label pt-2"
                    >
                        아쉬운 점
                    </Form.Label>

                    <Col sm={9}>

                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="closeBad"
                            value={close.closeBad}
                            onChange={changeCloseValue}
                            placeholder="프로젝트에서 아쉬웠던 점을 작성해주세요."
                        />

                    </Col>

                </Row>


                {/* 개선할 점 */}
                <Row className="project-form-group align-items-start">

                    <Form.Label
                        column
                        sm={3}
                        className="project-form-label pt-2"
                    >
                        개선할 점
                    </Form.Label>

                    <Col sm={9}>

                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="closeImprovement"
                            value={close.closeImprovement}
                            onChange={changeCloseValue}
                            placeholder="프로젝트에서 개선할 점을 작성해주세요."
                        />

                    </Col>

                </Row>


                {/* 버튼 */}
                <div className="project-form-actions">

                    <Button
                        type="button"
                        className="project-cancel-button"
                        onClick={() =>
                            navigate(
                                `/projects/${projectNo}/task`
                            )
                        }
                    >
                        취소
                    </Button>

                    <Button
                        type="button"
                        className="project-close-button"
                        disabled={valid === false}
                        onClick={closeProject}
                    >
                        프로젝트 종료
                    </Button>

                </div>

            </div>

        </div>
    );
}