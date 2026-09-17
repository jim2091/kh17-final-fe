import { Button, Card, Col, Form, Row, ToggleButton } from "react-bootstrap";
// import { loginUserState } from "@utils/storage";
import { useCallback, useState, useEffect, useMemo } from "react";
import { apiClient } from "@utils/reaxios";
// import { useAtomValue } from "jotai";
import { Link } from "react-router-dom";
import NoImage from "@assets/noimages.png";
import { toast } from "react-toastify";
import kakaoicon from "@assets/kakaoicon.png";
import Swal from "sweetalert2";

export default function Mypage() {
    // const { empNo } = useAtomValue(loginUserState) || {};
    const [emp, setEmp] = useState("");

    const [kakaoToggle, setKakaoToggle] = useState(false);
    useEffect(() => {
        loadData();
        loadKakaoConnected();
    }, []);
    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/member/me");


        setEmp(data);

    }, []);
    const loadKakaoConnected = useCallback(async () => {
        try {
            const { data } = await apiClient.get("member/kakao");
            setKakaoToggle(data);
        }
        catch (e) {
            console.log(error);
        }
    }, []);
    // console.log("내정보 : ", emp);

    const profileUrl = emp.attachNo ?
        `${import.meta.env.VITE_SERVER_URL}/api/attach/p/${emp.attachNo}` : null;

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

    const kakaoConnect = useCallback(async () => {
        const result = await Swal.fire({
            title: "카카오에 연결하시겠습니까?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "연결",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;
        const baseURL = import.meta.env.VITE_SERVER_URL;

        try {
            window.location.href = `${baseURL}/oauth/kakao/connect`;
            toast.success("연결되었습니다");
        }
        catch (e) {
            console.log("에러 : ", e);
            toast.error("연결에 실패하였습니다.")
        }


    }, []);
    const kakaoDisconnect = useCallback(async () => {
        const result = await Swal.fire({
            title: "카카오 연결을 해제하시겠습니까?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "해제",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;

        try {
            await apiClient.delete("/member/kakao");
            setKakaoToggle(false);
            toast.success("연결해제되었습니다");
        }
        catch (e) {
            console.log("에러 : ", e);
            toast.error("작업을 실패하였습니다.")
        }


    }, []);


    return (<>
        <div className="p-4">
            <Row className="mypage-content">

                {/* 왼쪽 : 프로필 */}
                <Col lg={5} md={6} className="mypage-profile">

                    <Row>
                        <Card className="border-0 profile-card">
                            <Card.Img
                                variant="top"
                                src={profileUrl === null ? NoImage : profileUrl}
                                className="profile-img"
                            />
                        </Card>
                    </Row>

                    <Row>
                        <Col className="d-flex align-items-center justify-content-between">
                            <span className="fs-3 text-nowrap">
                                {emp.empName}
                            </span>

                            <Button
                                as={Link}
                                to="/edit"
                                className="mypage-edit text-nowrap"
                            >
                                내 정보관리
                            </Button>
                        </Col>
                    </Row>

                    <div className="profile-line mt-1"></div>

                    <Row className="mt-4 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">
                            이메일
                        </Col>
                        <Col sm={10} className="text-secondary">
                            {emp.empEmail}
                        </Col>
                    </Row>

                    <Row className="mt-1 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">
                            부서
                        </Col>
                        <Col sm={10} className="text-secondary">
                            {emp.deptName}
                        </Col>
                    </Row>

                    <Row className="mt-1 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">
                            직급
                        </Col>
                        <Col sm={10} className="text-secondary">
                            {emp.positionName}
                        </Col>
                    </Row>

                    <Row className="mt-1 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">
                            생일
                        </Col>
                        <Col sm={10} className="text-secondary">
                            {emp.empBirth}
                        </Col>
                    </Row>

                    <Row className="mt-1 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">
                            연락처
                        </Col>
                        <Col sm={10} className="text-secondary">
                            {emp.empContact}
                        </Col>
                    </Row>

                    <Row className="mt-1 d-flex align-items-center">
                        <Col sm={2} className="fw-bold text-nowrap">
                            주소
                        </Col>
                        <Col sm={10} className="text-secondary">
                            {unionAddress}
                        </Col>
                    </Row>

                </Col>


                {/* 오른쪽 */}
                <Col lg={7} md={6} className="mypage-management">

                    {/* 계정 정보 */}
                    <Card className="mypage-card border-0">
                        <h4>계정 정보</h4>
                        <div className="profile-line"></div>

                        <Row className="mt-4">
                            <Col sm={3} className="fw-bold">
                                사번
                            </Col>
                            <Col sm={9} className="text-secondary">
                                {emp.empNo}
                            </Col>
                        </Row>

                        <Row className="mt-3">
                            <Col sm={3} className="fw-bold">
                                계정 상태
                            </Col>
                            <Col sm={9} className="text-secondary">
                                정상
                            </Col>
                        </Row>
                    </Card>


                    {/* 간편로그인 */}
                    <Card className="mypage-card border-0 mt-4">

                        <h4>간편로그인 연결 관리</h4>
                        <div className="profile-line"></div>

                        <div className="d-flex justify-content-between align-items-center mt-4">

                            <div className="d-flex align-items-center">
                                <img
                                    src={kakaoicon}
                                    className="kakao-image"
                                />
                                <span className="ms-2">
                                    카카오톡
                                </span>
                            </div>

                            <Form.Check
                                type="switch"
                                className="toggle"
                                checked={kakaoToggle}
                                onChange={(e) => {
                                    const checked = e.target.checked;

                                    if (checked) {
                                        kakaoConnect();
                                    } else {
                                        kakaoDisconnect();
                                    }
                                }}
                            />

                        </div>

                    </Card>

                </Col>

            </Row>

        </div>
    </>)
}