import { Button, Card, Col, Form, Row } from "react-bootstrap";
// import { loginUserState } from "@utils/storage";
import { useCallback, useState, useEffect, useMemo } from "react";
import { apiClient } from "@utils/reaxios";
// import { useAtomValue } from "jotai";
import { Link } from "react-router-dom";
import NoImage from "@assets/noimages.png";
import { toast } from "react-toastify";

export default function Mypage() {
    // const { empNo } = useAtomValue(loginUserState) || {};
    const [emp, setEmp] = useState("");
    useEffect(() => {
        loadData();
    }, []);
    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/member/me");

        setEmp(data);

    }, []);
    // console.log("내정보 : ", emp);

    const profileUrl = emp.attachNo ?
        `${import.meta.env.VITE_SERVER_URL}/api/attach/${emp.attachNo}` : null;

    const unionAddress = useMemo(() => {
        if (emp === null) return "";
        if (emp.empPost === null) return "";
        if (emp.empAddress1 === null) return "";
        if (emp.empAddress2 === null) return "";
        return `[${emp.empPost}] ${emp.empAddress1} ${emp.empAddress2}`;
    }, [emp]);

    // if (emp === null) {
    //     return (<h1>로딩중인 화면</h1>);
    // }

    const kakaoConnect = useCallback(async() => {
        const result = await Swal.fire({
            title: "카카오에 연결하시겠습니까?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "연결",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;
        const baseURL = import.meta.env.VITE_SERVER_URL;

        try{
            window.location.href = `${baseURL}/oauth/kakao/connect`;
            toast.success("연결되었습니다");
        }
        catch(e){
            console.log("에러 : ", e);
            toast.error("연결에 실패하였습니다.")
        }


    }, []);


    return (<>
        <div className="p-4">
            <Row>
                <Col sm={3}>
                    <Row>
                        <Card className="border-0" style={{ width: '18rem' }}>
                            <Card.Img variant="top" src={profileUrl === null ? NoImage : profileUrl}
                                className="profile-img"
                            ></Card.Img>
                        </Card>
                    </Row>

                    <Row>
                        <Col className="d-flex align-items-center justify-content-between">
                            <span className="fs-3 text-nowrap">{emp.empName}</span>
                            <Button as={Link} to="/edit"
                                className="ms-5 mypage-edit text-nowrap" >
                                <span>내 정보관리</span>
                            </Button>
                        </Col>
                    </Row>
                    <div className="profile-line mt-1"></div>

                    <Row className="mt-4 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">이메일</Col>
                        <Col sm={10} className="text-secondary">
                            <span>{emp.empEmail}</span>
                        </Col>
                    </Row>
                    <Row className="mt-1 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">부서</Col>
                        <Col sm={10} className="text-secondary">
                            <span>{emp.deptName}</span>
                        </Col>
                    </Row>
                    <Row className="mt-1 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">직급</Col>
                        <Col sm={10} className="text-secondary">
                            <span>{emp.positionName}</span>
                        </Col>
                    </Row>
                    <Row className="mt-1 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">생일</Col>
                        <Col sm={10} className="text-secondary">
                            <span>{emp.empBirth}</span>
                        </Col>
                    </Row>
                    <Row className="mt-1 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">연락처</Col>
                        <Col sm={10} className="text-secondary">
                            <span>{emp.empContact}</span>
                        </Col>
                    </Row>
                    <Row className="mt-1 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">주소</Col>
                        <Col sm={10} className="text-secondary">
                            <span>{unionAddress}</span>
                        </Col>
                    </Row>
                    <Button onClick={kakaoConnect}>카카오 연결</Button>
                </Col>
                <Col sm={9}>

                </Col>
            </Row>




        </div>

    </>)
}