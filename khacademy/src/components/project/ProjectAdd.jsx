// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
import { Row,Form } from "react-bootstrap";
import { FaAsterisk } from "react-icons/fa6";

export default function ProjectAdd() {
    // //state
    // const [project,setProject] = useState({
    //     projectName : "",
    //     projectPurpose : "",
    //     projectVisibility : "",
    //     projectStart : "",
    //     projectDeadline : ""
    // });

    // const [result, setResult] = useState({
    //     projectName : "",
    //     projectPurpose : "",
    //     projectVisibility : "",
    //     projectStart : "",
    //     projectDeadline : ""
    // });

    // const navigate = useNavigate();

    return (
        <>
            <h1>새 프로젝트 추가 테스트 화면22</h1>

            <Row className="mt-4">
                <Form.Label column sm={3}>
                    <span>프로젝트 이름</span>
                    <FaAsterisk className="text-danger" />
                </Form.Label>
            </Row>
        </>
    );
}
