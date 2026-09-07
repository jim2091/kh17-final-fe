import { Col, Row, Card } from "react-bootstrap";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@utils/reaxios";
import "./member.css";
import "@templates/project.css";



//사용자 목록을 보여주는 컴포넌트

export default function Members() {
    const [empList, setEmpList] = useState([]);



    useEffect(() => {
        loadData();


    }, []);



    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/member/");

        setEmpList(data);



    }, []);
    console.log("empList : ", empList);



    return (<>
    <div className="p-4">
        <Row className="user-header py-2 fw-bold">
            <Col className="text-nowrap">이름</Col>
            <Col className="d-none d-md-block text-nowrap">이메일</Col>
            <Col className="text-nowrap">부서</Col>
            <Col className="text-nowrap">직급</Col>
            <Col className="d-none d-md-block text-nowrap">생년월일</Col>
            <Col className="d-none d-md-block text-nowrap">연락처</Col>
            <Col className="d-none d-md-block text-nowrap">주소</Col>
        </Row>


        {empList.map((emp) => {
            return(<>
            
            <Card key={emp.empNo} className="mt-2 card">

                <Card.Body>
                    <Row>
                        <Col className="text-nowrap">{emp.empName}</Col>
                        <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empEmail}</Col>
                        <Col className="text-truncate text-nowrap">{emp.deptName}</Col>
                        <Col className="text-truncate text-nowrap">{emp.positionName}</Col>
                        <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empBirth}</Col>
                        <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empContact}</Col>
                        <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empAddress1}</Col>
                    </Row>
                </Card.Body>
            </Card>
            </>);
        })}
</div>
    </>);
}