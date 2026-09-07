import { Button, Col, Form, Row, Card } from "react-bootstrap";
import { FaCircle, FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@utils/reaxios";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { useWebSocket } from "@websocket/WebSocketProvider";
import "../member.css";
import "@templates/project.css";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import NoImage from "@assets/noimages.png";


export default function Users() {

    const [empList, setEmpList] = useState([]);


    const [keyword, setKeyword] = useState("");

    const [ selectedEmp, setSelectedEmp] = useState({});


    //부서목록 불러오기(부서명검색선택에서 쓰임)
    const [deptList, setDeptList] = useState([]);

    const deptNameSearch = useCallback(async () => {

        const { data } = await apiClient.get("/dept/");
        setDeptList(data);

    }, [deptList]);

    //직급목록 불러오기
    const [positionList, setPositionList] = useState([]);

    const positionNameSearch = useCallback(async () => {

        const { data } = await apiClient.get("/position/");
        setPositionList(data);

    }, [positionList]);

    const tabs = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ",
        "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];



    useEffect(() => {
        loadData();


    }, []);



    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/admin/");

        setEmpList(data);


        // console.log("전체 회원 목록 : ", data);
    }, []);

    const { users } = useWebSocket();

    // setUsers(users);
    // console.log("empList : ", empList);

    // if (empList === null) {
    //     return (<h1>로딩중인 화면</h1>);
    // }
    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setKeyword(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const changeNumericValue = useCallback((e) => {
        const { name, value } = e.target;

        setSelectedEmp({
            ...selectedEmp,//나머지 유지
            [name]: value
        });
    }, [selectedEmp]);
    // console.log("selectedEmp : ", selectedEmp);

    const search = useCallback(async () => {
        // console.log("검색 키워드:", condition);
        const { data } = await apiClient.post("/admin/complexSearch", keyword);

        setEmpList(data);
        // console.log("복합검색결과 : ", data);

    }, [keyword]);

    const searchInitial = useCallback(async (tab) => {
        const { data } = await apiClient.post("/admin/initial", {
            tab: tab
        });

        setEmpList(data);
    }, []);

    const changeState = useCallback(async (emp) => {
        const result = await Swal.fire({
            title: emp.empState === "active" ? "비활성화 하시겠습니까? " : "활성화하시겠습니까?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: emp.empState === "active" ? "비활성화" : "활성화",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;

        try {
            await apiClient.patch(`/admin/active/${emp.empNo}`);
            toast.success(emp.empState === "active" ? "비활성화되었습니다" : "활성화되었습니다.");

            await loadData();
        }
        catch (e) {
            console.log("에러 : ", e);
            toast.error("실행이 실패하였습니다. \n 잠시 후 다시 시도해주세요");
        }

    }, [loadData]);

    const changeData = useCallback(async (emp)=>{
        const result = await Swal.fire({
            title: "사원 정보를 수정하시겠습니까?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "수정",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;

        try{
            await apiClient.put(`/admin/memberEdit/${emp.empNo}`, {
                empNo : emp.empNo,
                empDeptNo : selectedEmp.empDeptNo,
                empPositionNo : selectedEmp.empPositionNo,
            });
            toast.success("수정되었습니다.");
            
            await loadData();
        }
        catch(error){
            console.log("error : ", error);
            toast.error("수정이 실패하였습니다. \n잠시 후 다시 시도해주세요.");
            
        }
        setSelectedEmp({});
    }, [loadData, selectedEmp]);


    return (<>
        <div className="p-4">
            <Row className="mt-4">
                <Col className="d-flex">
                    <Form.Control name="keyword"
                        placeholder="검색"
                        onChange={changeStringValue}
                        className="w-25"
                    ></Form.Control>
                    <Button onClick={search}
                        className="ms-2"
                    ><FaMagnifyingGlass /></Button>
                </Col>

            </Row>


            <Col className="d-flex justify-content-between align-items-center p-5">
                <h1>회원관리</h1>
                <Button as={Link} to="/invite">
                    <FaPlus />
                    사용자 초대하기
                </Button>
            </Col>


            <div className="tabs">
                <span className="tab" onClick={loadData}>전체</span>
                {tabs.map((tab) => (
                    <div key={tab}
                        className="tab"
                        onClick={() => searchInitial(tab)}>
                        <span>{tab}</span>
                    </div>
                ))}


            </div>
            <Row className="user-header py-2 fw-bold">
                <Col className="text-nowrap">사번/이름</Col>
                <Col className="text-nowrap">접속상태</Col>
                <Col className="d-none d-md-block text-nowrap">이메일</Col>
                <Col className="text-nowrap">부서</Col>
                <Col className="text-nowrap">직급</Col>
                <Col className="d-none d-md-block text-nowrap">생년월일</Col>
                <Col className="d-none d-md-block text-nowrap">연락처</Col>
                <Col className="d-none d-md-block text-nowrap">주소</Col>
                <Col className="text-nowrap">회원상태</Col>
            </Row>


            {empList.map((emp) => {
                const online = users.some(user => user.empNo === emp.empNo);

                return (

                    <Card key={emp.empNo} className={`mt-2 card ${online ? "" : "text-muted"}`}>
                        <OverlayTrigger
                            trigger="click"
                            placement="bottom"
                            rootClose={true}
                            overlay={
                                <Popover id={`popover-positioned-bottom`} className="user-popover">
                                    <Popover.Header as="h3">
                                        <Col>
                                            <img src={NoImage} className="profile-img"></img>
                                        </Col>
                                        <Col className="mt-4 text-end">{emp.empName}</Col>
                                    </Popover.Header>
                                    <Popover.Body>
                                        <Row className="mt-4">
                                            <Form.Label column sm={2}>부서</Form.Label>
                                            <Col sm={10}>
                                                <Form.Select onClick={deptNameSearch} name="empDeptNo"
                                                    className="w-100 d-inline-block"
                                                    value={selectedEmp.empDeptNo}
                                                onChange={changeNumericValue}
                                                >
                                                    <option value="">선택하세요</option>
                                                    {deptList.map(dept => (
                                                        <option key={dept.deptNo} value={dept.deptNo}>
                                                            {dept.deptName}
                                                        </option>
                                                    ))}

                                                </Form.Select>
                                            </Col>
                                        </Row>
                                        <Row className="mt-4">
                                            <Form.Label column sm={2}>직급</Form.Label>
                                            <Col sm={10}>
                                                <Form.Select onClick={positionNameSearch} name="empPositionNo"
                                                    className="w-100 d-inline-block"
                                                    value={selectedEmp.empPositionNo}
                                                onChange={changeNumericValue}
                                                >
                                                    <option value="">선택하세요</option>
                                                    {positionList.map(position => (
                                                        <option key={position.positionNo} value={position.positionNo}>
                                                            {position.positionName}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </Col>
                                        </Row>
                                        <Row className="mt-4">
                                            <Col sm={2}>이메일</Col>
                                            <Col sm={10}>{emp.empEmail}</Col>
                                        </Row>
                                        <Row className="mt-4">
                                            <Col sm={2}>생일</Col>
                                            <Col sm={10}>{emp.empBirth}</Col>
                                        </Row>
                                        <Row className="mt-4">
                                            <Col sm={2}>연락처</Col>
                                            <Col sm={10}>{emp.empContact}</Col>
                                        </Row>
                                        <Row className="mt-4">
                                            <Col sm={2}>주소</Col>
                                            <Col sm={10}>{emp.empPost} {emp.empAddress1} {emp.empAddress2}</Col>
                                        </Row>
                                        <Row className="mt-4">
                                            <Col sm={2}>상태</Col>
                                            <Col sm={10}>{emp.empState}</Col>
                                        </Row>
                                        
                                        <Row className="mt-4">
                                            <Col className="text-end">
                                                <Button onClick={()=>changeData(emp)}>
                                                    <span>수정하기</span>
                                                </Button>
                                            </Col>
                                        </Row>


                                    </Popover.Body>
                                </Popover>
                            }
                        >
                            <Card.Body>
                                <Row>
                                    <Col className="text-nowrap">{emp.empNo}/{emp.empName}</Col>
                                    <Col>
                                        <FaCircle className={online ? "text-info" : "text-secondary"} />
                                        <span className="ms-2">{online ? "online" : "offline"}</span>
                                    </Col>
                                    <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empEmail}</Col>
                                    <Col className="text-truncate text-nowrap">{emp.deptName}</Col>
                                    <Col className="text-truncate text-nowrap">{emp.positionName}</Col>
                                    <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empBirth}</Col>
                                    <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empContact}</Col>
                                    <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empAddress1}</Col>
                                    {/* {(emp.empState === "invited" || emp.empState === "inactive") && (<> */}
                                    <Col>
                                        <Button onClick={() => changeState(emp)}>
                                            <span>{emp.empState}</span>
                                        </Button>
                                    </Col>
                                    {/* </>)}
                                    {emp.empState === "active" && (<> */}
                                    {/* <Col xs={1}>
                                            <Button onClick={() => changeData(emp)}>
                                                <span>{emp.empState}</span>
                                            </Button>
                                        </Col> */}
                                    {/* </>)} */}
                                </Row>
                            </Card.Body>
                        </OverlayTrigger>
                    </Card>
                );
            })}


        </div>
    </>)
}