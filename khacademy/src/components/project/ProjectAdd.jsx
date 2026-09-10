import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../utils/reaxios";
import { Row, Form, Col, Button } from "react-bootstrap";
import { FaAsterisk, FaPlus } from "react-icons/fa6";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

export default function ProjectAdd() {

    //프로젝트 state
    const [project, setProject] = useState({
        projectName: "",
        projectPurpose: "",
        projectVisibility: "private",
        projectStart: "",
        projectDeadline: ""
    });

    //판정 결과 state
    const [result, setResult] = useState({
        projectName: null,       //필수
        projectPurpose: null,    //필수
        projectStart: null,      //선택
        projectDeadline: null    //선택
    });

    //페이지 이동
    const navigate = useNavigate();


    //입력값 변경
    const changeStringValue = useCallback((e) => {

        const { name, value } = e.target;

        setProject(prev => ({
            ...prev,
            [name]: value
        }));

    }, []);


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
            //최소
            if(result.isConfirmed === false){
                return;
            }
        }

            //공개범위 변경
            setProject(prev =>({
                ...prev,
                projectVisibility : value
            }));

    },[project.projectVisibility]);


    //전체 입력 가능 여부
    const valid = useMemo(() => {
        if(result.projectName !== "is-valid")return false;
        if(result.projectPurpose !== "is-valid")return false;
        return true;

    }, [result]);


    //프로젝트 등록
    const projectAdd = useCallback(async () => {

        //둘 다 입력했는데 마감일이 시작일보다 빠른 경우
        if(
            project.projectStart.length > 0 &&
            project.projectDeadline.length > 0 &&
            project.projectDeadline < project.projectStart
        ) {
            toast.warning("마감일은 시작일 이후로 설정해주세요");
            return;
        }

        try {
            const {data} = await apiClient.post( "/project/", project);

            toast.success("프로젝트가 생성되었습니다");

            navigate(`/projects/${data}/task`);

        }
        catch(e) {

            console.error(e);

            toast.error(
                "프로젝트 생성 과정에서 오류가 발생했습니다"
            );
        }

    }, [project, navigate]);


    return (
    <div className="project-page project-form-container">

        {/* 페이지 제목 */}
        <div className="project-page-header">
            <div className="mt-5">
                <h3 className="project-page-title">
                    프로젝트 생성
                </h3>

                <p className="project-page-description">
                    새로운 프로젝트의 기본 정보를 입력해주세요.
                </p>
            </div>
        </div>


        {/* 프로젝트 입력 영역 */}
        <div className="project-form-card">

            {/* 프로젝트명 */}
            <Row className="project-form-group align-items-start">

                <Form.Label
                    column
                    sm={3}
                    className="project-form-label pt-2"
                >
                    <span>프로젝트명</span>

                    <FaAsterisk
                        className="text-danger ms-1"
                        size={7}
                    />
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
            <Row className="project-form-group align-items-start">

                <Form.Label
                    column
                    sm={3}
                    className="project-form-label pt-2"
                >
                    <span>프로젝트 목적</span>

                    <FaAsterisk
                        className="text-danger ms-1"
                        size={7}
                    />
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
                        placeholder="프로젝트의 목적과 진행 배경을 입력해주세요."
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
            <Row className="project-form-group align-items-start">

                <Form.Label
                    column
                    sm={3}
                    className="project-form-label pt-2"
                >
                    <span>공개 범위</span>

                    <FaAsterisk
                        className="text-danger ms-1"
                        size={7}
                    />
                </Form.Label>

                <Col sm={9}>

                    <div className="pt-2">

                        <Form.Check
                            inline
                            type="radio"
                            label="공개"
                            name="projectVisibility"
                            value="public"
                            checked={
                                project.projectVisibility
                                === "public"
                            }
                            onChange={changeVisibility}
                        />

                        <Form.Check
                            inline
                            type="radio"
                            label="비공개"
                            name="projectVisibility"
                            value="private"
                            checked={
                                project.projectVisibility
                                === "private"
                            }
                            onChange={changeVisibility}
                        />

                    </div>

                </Col>
            </Row>


            {/* 시작일 */}
            <Row className="project-form-group align-items-start">

                <Form.Label
                    column
                    sm={3}
                    className="project-form-label pt-2"
                >
                    프로젝트 시작일
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
            <Row className="project-form-group align-items-start">

                <Form.Label
                    column
                    sm={3}
                    className="project-form-label pt-2"
                >
                    프로젝트 마감일
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


            {/* 버튼 */}
            <div className="project-form-actions">

                <Button
                    type="button"
                    className="project-cancel-button"
                    onClick={() =>
                        navigate("/projects/my")
                    }
                >
                    취소
                </Button>

                <Button
                    type="button"
                    className="project-primary-button"
                    disabled={valid === false}
                    onClick={projectAdd}
                >
                    <FaPlus className="me-2"/>
                    등록하기
                </Button>

            </div>

        </div>

    </div>
);
}