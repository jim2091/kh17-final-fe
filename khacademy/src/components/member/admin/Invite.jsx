import { Col, Row, Button, Form } from "react-bootstrap";
import { useCallback, useState } from 'react'
import { apiClient } from "@utils/reaxios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";




export default function invite() {
    const [emp, setEmp] = useState({
        empEmail: "",
        empPassword: ""
    });
    const navigate = useNavigate();
    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setEmp(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);
    const changeNumericValue = useCallback((e)=>{
        const { name , value } = e.target;
        const regex = /[^0-9]/g;
        const replacement = value.replace(regex, "");//숫자가 아닌 요소를 제거
        const result = parseInt(replacement || 0);//숫자로 변환
        
        setEmp({
            ...emp,//나머지 유지
            [name] : result
        });
    }, [emp]);

    const invite = useCallback(async () => {
        const result = await Swal.fire({
            title:"사용자 초대 이메일을 보내시겠습니까?",
            icon:"warning",
            confirmButtonText:"네",
            cancelButtonText:"아니오",
            showCancelButton:true,
        });
        if(result.isConfirmed === false) return;
        await apiClient.post("/admin/add", emp);
        // await apiClient.post("/admin/invite", emp);
        navigate("/");
        toast.success("사용자 초대 완료!");
    }, [emp]);
    return (<>

        <Row>
            <Col>
                <h1> 사용자 초대하기</h1>

            </Col>
        </Row>
        <Row className="mt-4">
            <Form.Label column sm={3}>이름</Form.Label>
            <Col sm={9}>
                <Form.Control type="text" name="empName" value={emp.empName}
                    onChange={changeStringValue} placeholder="사용자 이름"
                    autoFocus />
            </Col>
        </Row>

        <Row className="mt-4">
            <Form.Label column sm={3}>이메일</Form.Label>
            <Col sm={9}>
                <Form.Control type="text" name="empEmail" value={emp.empEmail}
                    onChange={changeStringValue} placeholder="사용자 이메일"
                    autoFocus />
            </Col>
        </Row>
        <Row className="mt-4">
            <Form.Label column sm={3}>부서</Form.Label>
            <Col sm={9}>
                <Form.Select name="empDeptNo"
                    value={emp.empDeptNo}
                    onChange={changeNumericValue}>
                    <option value="">선택하세요</option>
                    <option value="1">개발팀</option>
                    <option value="2">디자인팀</option>
                    <option value="3">마케팅팀</option>
                    <option value="4">경영지원팀</option>
                    <option value="5">영업팀</option>
                </Form.Select>
            </Col>
        </Row>
        <Row className="mt-4">
            <Form.Label column sm={3}>직급</Form.Label>
            <Col sm={9}>
                <Form.Select name="empPositionNo"
                    value={emp.empPositionNo}
                    onChange={changeNumericValue}>
                    <option value="">선택하세요</option>
                    <option value="1">사원</option>
                    <option value="2">대리</option>
                    <option value="3">과장</option>
                    <option value="4">부장</option>
                    <option value="5">팀장</option>
                    <option value="6">임원</option>
                    <option value="7">대표</option>
                </Form.Select>
            </Col>
        </Row>


        <Row className="mt-4 text-center">
            <Col>


                <Button onClick={invite}>
                    초대하기
                </Button>
            </Col>
        </Row>
    </>)
}