
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useKakaoPostcodePopup } from 'react-daum-postcode';
import { apiClient } from "@utils/reaxios";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import DatePicker from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

import dayjs from "dayjs";
import "dayjs/locale/ko";
import { FaAsterisk, FaEye, FaEyeSlash, FaMagnifyingGlass, FaSquarePen, FaXmark } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
dayjs.locale("ko");

import NoImage from "@assets/noimages.png";
import "./member.css";

export default function Edit() {
    //kakao post
    const open = useKakaoPostcodePopup("//t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js");

    //state
    const [emp, setEmp] = useState({
        empEmail: "",
        empName: "",
        deptName: "",
        positionName: "",
        prevEmpPassword: "",
        newEmpPassword1: "",
        newEmpPassword2: "",
        empBirth: "",
        empContact: "",
        empPost: "",
        empAddress1: "",
        empAddress2: "",

    });
    // console.log("emp : ", emp);

    //피드백을 위한 state
    const [result, setResult] = useState({
        prevEmpPassword: null,
        newEmpPassword1: { clazz: null, code: null },
        newEmpPassword2: { clazz: null, code: null },
        empBirth: null,
        empContact: null,
        empPost: null,
        empAddress1: null,
        empAddress2: null,

    });

    //비번 보이기/안보이기
    const [visible, setVisible] = useState({
        prevEmpPassword: false,
        newEmpPassword1: false,
        newEmpPassword2: false,
    });

    //프로필 사진 state
    const [empProfile, setEmpProfile] = useState(null);
    const empProfileRef = useRef();


    //처음 내 정보 불러오기 
    useEffect(() => {
        loadData();
    }, []);


    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/member/me");
        // console.log("data : ", data);

        setEmp(data);
    }, []);

    const profileUrl = emp.attachNo ?
        `${import.meta.env.VITE_SERVER_URL}/api/attach/${emp.attachNo}` : null;

    // console.log("emp : ", emp);

    const changeProfileImage = useCallback((e) => {
        const file = e.target.files[0];

        setEmpProfile(file);


    }, []);

    const clearEmpProfile = useCallback(() => {
        setEmpProfile(null);
        empProfileRef.current.value = "";

    }, []);

    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;

        setEmp(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);



    const checkEmpBirth = useCallback(e => {
        const clazz = "is-valid";
        setResult(prev => ({ ...prev, empBirth: clazz }));
    }, [emp]);

    const checkEmpContact = useCallback(e => {
        const regex = /^010[1-9][0-9]{7}$/;
        const valid = emp.empContact.length === 0 || regex.test(emp.empContact);
        const clazz = valid ? "is-valid" : "is-invalid";
        setResult(prev => ({ ...prev, empContact: clazz }));
    }, [emp]);

    const checkEmpAddress = useCallback(e => {
        const empty = emp.empPost === "" && emp.empAddress1 === ""
            && emp.empAddress2 === "";
        const fill = emp.empPost !== "" && emp.empAddress1 !== ""
            && emp.empAddress2 !== "";
        const valid = empty || fill;
        const clazz = valid ? "is-valid" : "is-invalid";
        setResult(prev => ({
            ...prev,
            empPost: clazz,
            empAddress1: clazz,
            empAddress2: clazz
        }));
    }, [emp]);

    const address2ref = useRef();
    //우편번호처리
    const addressSearch = useCallback((e) => {
        const { tagName, value } = e.target;

        if (tagName === "INPUT" && value !== "") return;
        open({
            onComplete: (data) => {
                const address = data.userSelectedType === "R" ?
                    data.roadAddress : data.jibunAddress;
                const zonecode = data.zonecode;

                //주소변경
                setEmp(prev => ({
                    ...prev,
                    empPost: zonecode,
                    empAddress1: address,
                    empAddress2: ""
                }));

                //상세주소창에 포커스를 줄수 있나? 
                //ref를 사용 
                address2ref.current.focus();
            }
        });
    }, []);

    const clearAddress = useCallback(e => {
        if (parseInt(e.currentTarget.style.opacity) === 0) return;
        //입력값 초기화
        setEmp(prev => ({
            ...prev,
            empPost: "",
            empAddress1: "",
            empAddress2: "",
        }))
        setResult(prev => ({
            ...prev,
            empPost: null,
            empAddress1: null,
            empAddress2: null,
        }))
    }, []);

    //주소 삭제버튼이 나와야되는지 판정하기 위한 memo
    //memo는 연관항목을 타이트하게 줘야한다
    const isAddressWritten = useMemo(() => {
        if (emp.empPost !== "") return true;
        if (emp.empAddress1 !== "") return true;
        if (emp.empAddress2 !== "") return true;
        return false;
    }, [
        emp.empPost,
        emp.empAddress1,
        emp.empAddress2,
    ]);

    const checkEmpPassword = useCallback(e => {
        const valid = !!emp.prevEmpPassword;
        const clazz = valid ? "is-valid" : "is-invalid";

        setResult(prev => ({
            ...prev,
            prevEmpPassword: clazz,
        }));

    }, [emp]);
    const checkNewEmpPassword = useCallback(e => {
        const valid = (!!emp.newEmpPassword1 && !!emp.newEmpPassword2) ||
            (!emp.newEmpPassword1 && !emp.newEmpPassword2);

        if (valid) {

            setResult(prev => ({
                ...prev,
                newEmpPassword1: { clazz: "is-valid", code: null },
                newEmpPassword2: { clazz: "is-valid", code: null },
            }));

        }
        if (valid === false) {
            setResult(prev => ({
                ...prev,
                newEmpPassword1: { clazz: "is-invalid", code: null },
                newEmpPassword2: { clazz: "is-invalid", code: null },
            }));
        }

        const confirm = emp.newEmpPassword1 === emp.newEmpPassword2;
        if (confirm === false) {
            setResult(prev => ({
                ...prev,
                newEmpPassword1: { clazz: "is-invalid", code: "mismatch" },
                newEmpPassword2: { clazz: "is-invalid", code: "mismatch" },
            }));
        }

    }, [emp]);




    const allValid = useMemo(() => {
        if (result.prevEmpPassword !== "is-valid") return false;
        // if (result.newEmpPassword1 === "is-invalid") return false;
        // if (result.newEmpPassword2 === "is-invalid") return false;

        if (result.empBirth === "is-invalid") return false;
        if (result.empContact === "is-invalid") return false;
        if (result.empPost === "is-invalid") return false;
        if (result.empAddress1 === "is-invalid") return false;
        if (result.empAddress2 === "is-invalid") return false;
        return true;
    }, [result, emp]);

    //최종 수정
    const navigate = useNavigate();
    const sendData = useCallback(async () => {

        try {
            const form = new FormData();
            form.append("emp", new Blob(
                [JSON.stringify(emp)],
                { type: "application/json" }
            ));
            form.append("empProfile", empProfile);
            // const copy = { ...emp };
            const { data } = await apiClient.put("/member/", form);
            // console.log("data : ", data);
            if (data.status === true) {
                toast.success(data.message);
                navigate("/me");
            }
        }
        catch (e) {//자격이 없어서 오류가 났을 때 
            console.error(e);
            await Swal.fire({
                title: "서버오류발생",
                icon: "warning",
                text: "잠시후 다시 시도해주세요",
                confirmButtonText: "확인",
            });

        }
    }, [emp]);

    return (<>
        <div className="p-4">


            {/* 프로필 사진 */}
            <Row>
                <Card className="border-0" style={{ width: '18rem' }}>

                    <Card.Img variant="top" src={profileUrl === null ? NoImage : profileUrl}
                        className="profile-img"
                    ></Card.Img>
                </Card>
            </Row>
            <Row className="mt-5">

                <div className="d-flex w-100">
                    <Form.Control type="file" accept="image/*" name="empProfile"
                        onChange={changeProfileImage}
                        ref={empProfileRef} className="w-50"></Form.Control>
                    {empProfile !== null && (
                        <Button variant="secondary" onClick={clearEmpProfile}
                            className="ms-2">
                            <FaXmark />
                        </Button>
                    )}
                </div>
            </Row>

            <Row className="mt-4">
                <Col>
                    {emp.empName} 님의 정보
                </Col>
            </Row>
            <Row className="mt-4">
                <Col sm={3} className="fw-bold text-info">이메일</Col>
                <Col sm={9} className="text-secondary">
                    <span>{emp.empEmail}</span>
                </Col>
            </Row>
            <Row className="mt-4">
                <Col sm={3} className="fw-bold text-info">부서</Col>
                <Col sm={9} className="text-secondary">
                    <span>{emp.deptName}</span>
                </Col>
            </Row>
            <Row className="mt-4">
                <Col sm={3} className="fw-bold text-info">직급</Col>
                <Col sm={9} className="text-secondary">
                    <span>{emp.positionName}</span>
                </Col>
            </Row>

            <Row className="mt-4">
                <Form.Label column sm={3} className="fw-bold text-info">
                    <span>생년월일</span>
                </Form.Label>
                <Col sm={9}>
                    <DatePicker name="empBirth"
                        locale={ko}
                        selected={emp.empBirth}
                        onChange={(date) => {
                            const convertDate = dayjs(date).format("YYYY-MM-DD");
                            setEmp(prev => ({ ...prev, empBirth: convertDate }))
                        }}
                        dateFormat={"yyyy-MM-dd"}
                        customInput={<Form.Control />}
                        wrapperClassName="w-100"
                        onBlur={checkEmpBirth}
                        className={result.empBirth}
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                    />
                    <div className="invalid-feedback">올바른 날짜 형식이 아닙니다</div>
                </Col>
            </Row>
            <Row className="mt-4">
                <Form.Label column sm={3} className="fw-bold text-info">
                    <span>연락처</span>
                </Form.Label>
                <Col sm={9}>
                    <Form.Control type="text" inputMode="tel" name="empContact"
                        value={emp.empContact ?? ""} onChange={changeStringValue}
                        onBlur={checkEmpContact} className={result.empContact}
                    />
                    <div className="invalid-feedback">ex: 01012345678</div>
                </Col>
            </Row>
            <Row className="mt-4">
                <Form.Label column sm={3} className="fw-bold text-info">
                    <span>주소</span>
                </Form.Label>
                <Col sm={9}>
                    <div className="d-flex">
                        <Form.Control type="text" inputMode="numeric"
                            name="empPost"
                            value={emp.empPost ?? ""} readOnly onClick={addressSearch}
                            className={`${result.empPost} w-auto d-inline-block`}
                            placeholder="우편번호"
                        />
                        <Button variant="success" className="ms-2"
                            onClick={addressSearch}>
                            <FaMagnifyingGlass />
                            <span className="d-none d-lg-inline-block">우편번호 검색</span>
                        </Button>
                        <Button variant="danger" className="ms-2" onClick={clearAddress}
                            style={
                                {
                                    opacity: isAddressWritten === true ? 100 : 0,
                                    transition: "opacity 0.1s ease-out",
                                }
                            }>
                            <FaXmark />
                            <span className="d-none d-lg-inline-block">작성내역 지우기</span>
                        </Button>
                    </div>
                </Col>
            </Row>
            <Row className="mt-4">
                <Col sm={{ span: 9, offset: 3 }}>
                    <Form.Control type="text" name="empAddress1"
                        value={emp.empAddress1 ?? ""} readOnly onClick={addressSearch}
                        className={result.empAddress1}
                        placeholder="기본주소"
                    />
                </Col>
            </Row>
            <Row className="mt-4">
                <Col sm={{ span: 9, offset: 3 }}>
                    <Form.Control type="text" name="empAddress2"
                        value={emp.empAddress2 ?? ""} onChange={changeStringValue}
                        onBlur={checkEmpAddress} className={result.empAddress2}
                        placeholder="상세주소"
                        ref={address2ref}
                    />
                    <div className="invalid-feedback">주소는 비우거나 모두 작성해야 합니다</div>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col sm={3} className="fw-bold text-info">비밀번호 변경</Col>
                <Col><hr /></Col>
            </Row>

            <Row className="mt-4">
                <Form.Label column sm={3} className="fw-bold text-info">
                    <span>기존 비밀번호</span>
                    {visible.prevEmpPassword === true ? (
                        <FaEye className="text-warning ms-4" onClick={e => {
                            setVisible(prev => ({ ...prev, prevEmpPassword: false }));
                        }} />

                    ) : (
                        <FaEyeSlash className="text-warning ms-4" onClick={e => {
                            setVisible(prev => ({ ...prev, prevEmpPassword: true }));
                        }} />

                    )}
                </Form.Label>
                <Col sm={9}>
                    <Form.Control type={visible.prevEmpPassword ? "text" : "password"}
                        name="prevEmpPassword"
                        value={emp.prevEmpPassword ?? ""} onChange={changeStringValue}
                        onBlur={checkEmpPassword} className={result.prevEmpPassword}
                    />
                    <div className="invalid-feedback">비밀번호는 필수 항목입니다</div>
                </Col>
            </Row>
            <Row className="mt-2">
                <Form.Label column sm={3} className="fw-bold text-info">
                    <span>새 비밀번호</span>
                    {visible.newEmpPassword1 === true ? (
                        <FaEye className="text-warning ms-4" onClick={e => {
                            setVisible(prev => ({ ...prev, newEmpPassword1: false }));
                        }} />

                    ) : (
                        <FaEyeSlash className="text-warning ms-4" onClick={e => {
                            setVisible(prev => ({ ...prev, newEmpPassword1: true }));
                        }} />

                    )}
                </Form.Label>
                <Col sm={9}>
                    <Form.Control type={visible.newEmpPassword1 ? "text" : "password"} name="newEmpPassword1"
                        value={emp.newEmpPassword1 ?? ""} onChange={changeStringValue}
                        onBlur={checkNewEmpPassword} className={result.newEmpPassword1.clazz}
                    />
                    <div className="invalid-feedback"></div>
                </Col>
            </Row>
            <Row className="mt-2">
                <Form.Label column sm={3} className="fw-bold text-info">
                    <span>새 비밀번호 확인</span>
                    {visible.newEmpPassword2 === true ? (
                        <FaEye className="text-warning ms-4" onClick={e => {
                            setVisible(prev => ({ ...prev, newEmpPassword2: false }));
                        }} />

                    ) : (
                        <FaEyeSlash className="text-warning ms-4" onClick={e => {
                            setVisible(prev => ({ ...prev, newEmpPassword2: true }));
                        }} />

                    )}
                </Form.Label>
                <Col sm={9}>
                    <Form.Control type={visible.newEmpPassword2 ? "text" : "password"} name="newEmpPassword2"
                        value={emp.newEmpPassword2 ?? ""} onChange={changeStringValue}
                        onBlur={checkNewEmpPassword} className={result.newEmpPassword2.clazz}
                    />
                    <div className="invalid-feedback">
                        {result.newEmpPassword2.code === "mismatch" && (<>
                            비밀번호가 일치하지 않습니다.
                        </>)}
                    </div>
                </Col>
            </Row>



            <Row className="mt-5">
                <Col className="text-center">
                    <Button variant="warning"
                        disabled={allValid === false}
                        onClick={sendData}>
                        <FaSquarePen />
                        <span className="ms-2">수정하기</span>
                    </Button>
                </Col>
            </Row>
        </div>

    </>)
}