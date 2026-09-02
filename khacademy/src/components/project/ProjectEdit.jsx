import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
import { Row,Form, Col, Button, Spinner } from "react-bootstrap";
import { FaAsterisk, FaPlus } from "react-icons/fa6";
import Swal from "sweetalert2";

export default function ProjectEdit() {
    
    //프로젝트 번호
    const { projectNo } = useParams();
    //로딩상태
    const [loading , setLoading] = useState(true);

    //프로젝트 정보
    const [project,setProject] = useState({
        projectName : "",
        projectPurpose : "",
        projectVisibility : "public",
        projectStart : "",
        projectDeadline : ""
    });
    
    //검사 결과
    const [result,setResult] = useState({
        projectName : null,
        projectPurpose : null,
        projectStart : null,
        projectDeadline : null
    });
    
    //페이지 이동
    const navigate =useNavigate();

    //입력값 변경
    const changeStringValue = useCallback((e)=> {
        const {name,value} = e.target;

        setProject(prev=>({
            ...prev,
            [name]:value
        }));
    },[]);

    //프로젝트 이름 검사
    const checkProjectName = useCallback(() => {

        const length = project.projectName.trim().length;
        const valid = length >= 1 && length <= 100;

        setResult(prev => ({
            ...prev,
            projectName: valid ? "is-valid" : "is-invalid"
        }));

    }, [project.projectName]);

    //프로젝트 목적 검사
    const checkProjectPurpose = useCallback(() => {

        const length = project.projectPurpose.trim().length;
        const valid = length >= 1 && length <= 300;

        setResult(prev => ({
            ...prev,
            projectPurpose: valid ? "is-valid" : "is-invalid"
        }));

    }, [project.projectPurpose]);

    //프로젝트 시작일 검사
    const checkProjectStart = useCallback(() => {

        //선택 항목이므로 비어있으면 정상 처리
        if(project.projectStart.length === 0) {

            setResult(prev => ({
                ...prev,
                projectStart: null
            }));

            return;
        }

    }, [project.projectStart]);


    //프로젝트 마감일 검사
    const checkProjectDeadline = useCallback(() => {

        //선택 항목이므로 비어있으면 정상 처리
        if(project.projectDeadline.length === 0) {

            setResult(prev => ({
                ...prev,
                projectDeadline: null
            }));

            return;
        }

    }, [project.projectDeadline]);

    //공개범위 변경
    const changeVisibility = useCallback(async(e)=>{
        const value = e.target.value;

        //비공개->공개
        if(project.projectVisibility === "private" &&
            value === "public"
        ){
            const result = await Swal.fire({
                icon : "warning",
                title : "공개 프로젝트로 변경하시겠습니까?",
                text : "공개로 변경하면 모든 사원에게 조회가 됩니다.",
                showCancelButton : true,
                confirmButtonText : "변경",
                cancelButtonText : "취소"
            })

            //취소
            if(result.isConfirmed === false){
                return;
            }
        }

        //공개범위 변경
        setProject(prev => ({
            ...prev,
            projectVisibility : value
        }));
    },[project.projectVisibility]);

    //전체 입력 가능 여부
    const valid = useMemo(()=>{
        if(result.projectName !== "is-valid") return false;
        if(result.projectPurpose !== "is-valid") return false;
        return true;
    }, [result]);

    //프로젝트 상세조회
    const loadProject = useCallback(async ()=>{
        try{
            setLoading(true);

            const {data} = await apiClient.get(`/project/${projectNo}`);

            //owner가 아닌경우
            if(data.projectMemberRole !== "owner"){
                toast.warning("프로젝트 수정 권한이 없습니다.");
                navigate(`/projects/${projectNo}/task`);
                return;
            }

            //data가 들어올때 시작,마감일 초,밀리초 제거를 위해 변환해서 가져옴
            setProject({
                projectName : data.projectName,
                projectPurpose : data.projectPurpose,
                projectVisibility : data.projectVisibility,

                projectStart : data.projectStart
                    ? data.projectStart.slice(0,16) : "",
                projectDeadline : data.projectDeadline
                    ? data.projectDeadline.slice(0,16) : ""
            });

            //필수항목은 정상처리
            setResult({
                projectName : "is-valid",
                projectPurpose : "is-valid",
                projectStart : null,
                projectDeadline : null
            })
        }
        catch(e){
            console.error(e);
            toast.error("프로젝트 정보를 불러오지 못했습니다.");
            navigate("/projects/my");
        }
        finally{
            setLoading(false);
        }

    },[projectNo])

    //첫 화면
    useEffect(()=>{
        loadProject();
    },[])
    

    //수정 함수
    const projectEdit = useCallback(async()=>{
        //시작,마감일 입력했을때 검사
        if(
            project.projectStart !== "" &&
            project.projectDeadline !== "" &&
            project.projectDeadline < project.projectStart
        ){
            toast.warning("마감일은 시작일 이후로 설정해주세요.");
            return;
        }

        try{
            await apiClient.put(`/project/${projectNo}`,project);
            toast.success("프로젝트가 수정되었습니다.");
            navigate(`/projects/${projectNo}/task`);
        }
        catch(e){
            console.error(e);
            toast.error("프로젝트 수정에 실패했습니다.");
        }
    },[project,projectNo])

    if(loading === true){
        return(
            <div className="text-center mt-5">
                <Spinner animation="border"/>
                <div className="mt-2">
                    프로젝트 정보를 불러오는 중입니다...
                </div>
            </div>
        )
    }

    //view
    return (<>
        {/* 프로젝트명 */}
            <Row className="mt-4">
                <Form.Label column sm={3}>
                    <span>프로젝트명</span>
                    <FaAsterisk className="text-danger"/>
                </Form.Label>

                <Col sm={9}>
                    <Form.Control
                        type="text"
                        name="projectName"
                        value={project.projectName}
                        onChange={changeStringValue}
                        placeholder="e.g. 쇼핑몰 홈페이지 만들기"
                        onBlur={checkProjectName}
                        className={result.projectName}
                    />

                    <div className="valid-feedback">
                        프로젝트명이 설정되었습니다.
                    </div>

                    <div className="invalid-feedback">
                        프로젝트명은 1자 이상 100자 이하로 입력해주세요.
                    </div>
                </Col>
            </Row>


            {/* 프로젝트 목적 */}
            <Row className="mt-4">
                <Form.Label column sm={3}>
                    <span>프로젝트 목적</span>
                    <FaAsterisk className="text-danger"/>
                </Form.Label>

                <Col sm={9}>
                    <Form.Control
                        as="textarea"
                        rows={5}
                        name="projectPurpose"
                        value={project.projectPurpose}
                        onChange={changeStringValue}
                        onBlur={checkProjectPurpose}
                        className={result.projectPurpose}
                    />

                    <div className="valid-feedback">
                        프로젝트 목적이 설정되었습니다.
                    </div>

                    <div className="invalid-feedback">
                        프로젝트 목적은 1자 이상 300자 이하로 입력해주세요.
                    </div>
                </Col>
            </Row>


            {/* 공개 범위 */}
            <Row className="mt-4">
                <Form.Label column sm={3}>
                    <span>공개 범위</span>
                    <FaAsterisk className="text-danger"/>
                </Form.Label>

                <Col sm={9}>
                    <Form.Check
                        inline
                        type="radio"
                        label="공개"
                        name="projectVisibility"
                        value="public"
                        checked={project.projectVisibility === "public"}
                        onChange={changeVisibility}
                    />

                    <Form.Check
                        inline
                        type="radio"
                        label="비공개"
                        name="projectVisibility"
                        value="private"
                        checked={project.projectVisibility === "private"}
                        onChange={changeVisibility}
                    />
                </Col>
            </Row>


            {/* 시작일 */}
            <Row className="mt-4">
                <Form.Label column sm={3}>
                    <span>프로젝트 시작일</span>
                </Form.Label>

                <Col sm={9}>
                    <Form.Control
                        type="datetime-local"
                        name="projectStart"
                        value={project.projectStart}
                        onChange={changeStringValue}
                        onBlur={checkProjectStart}
                        className={result.projectStart}
                    />

                    <div className="invalid-feedback">
                        날짜 형식이 올바르지 않습니다.
                    </div>
                </Col>
            </Row>


            {/* 마감일 */}
            <Row className="mt-4">
                <Form.Label column sm={3}>
                    <span>프로젝트 마감일</span>
                </Form.Label>

                <Col sm={9}>
                    <Form.Control
                        type="datetime-local"
                        name="projectDeadline"
                        value={project.projectDeadline}
                        onChange={changeStringValue}
                        onBlur={checkProjectDeadline}
                        className={result.projectDeadline}
                    />

                    <div className="invalid-feedback">
                        날짜 형식이 올바르지 않습니다.
                    </div>
                </Col>
            </Row>

            {/* 수정 버튼 */}
            <Row className="mt-5">
                <Col>
                    <Button
                        type="button"
                        variant="success"
                        className="w-100"
                        disabled={valid === false}
                        onClick={projectEdit}
                    >
                        <FaPlus className="me-2"/>
                        <span>수정하기</span>
                    </Button>
                </Col>
            </Row>
    </>)
}