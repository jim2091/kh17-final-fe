import { Col, Row, Button, Form } from "react-bootstrap";
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from "@utils/reaxios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../member.css";
import { FaMagnifyingGlass, FaXmark } from "react-icons/fa6";
import { useAtomValue } from "jotai";
import { loginUserState } from "@utils/storage";
import { MdAdminPanelSettings } from "react-icons/md";




export default function invite() {
    const { empLevel } = useAtomValue(loginUserState) || {};

    const [emp, setEmp] = useState({
        empName: "",
        empEmail: "",
        empPassword: "",
        empDeptNo: "",
        empPositionNo: "",
    });
    const [result, setResult] = useState({
        empName: null,
        empEmail: { clazz: null, code: null },
    });

    //부서목록 불러오기(부서명검색선택에서 쓰임)
    const [deptList, setDeptList] = useState([]);

    const deptNameSearch = useCallback(async () => {

        const { data } = await apiClient.get("/dept/search");
        setDeptList(data);

    }, []);
    //직급목록 불러오기
    const [positionList, setPositionList] = useState([]);

    const positionNameSearch = useCallback(async () => {

        const { data } = await apiClient.get("/position/search");
        setPositionList(data);

    }, []);

    //사원 목록 불러오기
    const [empList, setEmpList] = useState([]);

    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/member/");
        setEmpList(data);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    // console.log("사원목록 : ", empList);

    const [keyword, setKeyword] = useState("");
    const [showAutoComplete, setShowAutoComplete] = useState(false);

    const [resultList, setResultList] = useState([]);
    const navigate = useNavigate();

    const autoCompleteList = useMemo(() => {
        if (!keyword) return [];
        return empList.filter(emp => emp.empName?.startsWith(keyword));

    }, [empList, keyword]);

    const fillkeyword = useCallback((emp) => {
        const data = `${emp.empName}(${emp.deptName}/${emp.positionName})`
        setKeyword(data);
        setShowAutoComplete(false);
    }, []);
    const empSearch = useCallback(async (e) => {
        e.preventDefault();
        const { data } = await apiClient.post("/admin/empSearch", {
            keyword: keyword
        });
        setResultList(data);
        setShowAutoComplete(false);
    }, [keyword]);
    // console.log("검색 결과 : ", resultList);
    const adminNumber = useMemo(() => {
        return empList.filter(emp => emp.empLevel === "admin").length;
    }, [empList]);

    const becomeAdmin = useCallback(async (emp) => {
        if (emp.empLevel === empLevel) {
            toast.error("자기 자신의 관리자 권한은 변경할 수 없습니다.");
            return;
        }
        // 마지막 관리자라면 관리자 권한 해제 불가
        if (emp.empLevel === "admin" && adminNumber <= 1) {
            toast.error("관리자는 최소 1명 이상이어야 합니다.");
            return;
        }

        const result = await Swal.fire({
            title: emp.empLevel === "member" ? `${emp.empName}님을 관리자로 지정하시겠습니까?` : "실행을 되돌리시겠습니까?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "네",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;
        try {
            await apiClient.patch(`/admin/becomeAdmin/${emp.empNo}`);
            toast.success("성공하였습니다!");
            setResultList([]);
            setKeyword("");
        }
        catch (e) {
            console.log("에러 : ", e);
            toast.error("실행이 실패하였습니다. \n 잠시 후 다시 시도해주세요");
        }
    }, [empLevel,adminNumber]);



    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setEmp(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);
    const changeNumericValue = useCallback((e) => {
        const { name, value } = e.target;
        const regex = /[^0-9]/g;
        const replacement = value.replace(regex, "");//숫자가 아닌 요소를 제거
        const result = parseInt(replacement || 0);//숫자로 변환

        setEmp({
            ...emp,//나머지 유지
            [name]: result
        });
    }, [emp]);
    const checkEmpEmail = useCallback(async e => {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,}$/;
        const valid = regex.test(emp.empEmail);
        if (valid === false) {
            setResult(prev => ({
                ...prev,
                empEmail: { clazz: "is-invalid", code: "format" }
            }));
            return;
        }
        const { data } = await apiClient.get(`/admin/check-email/${emp.empEmail}`)
        const clazz = data ? "is-valid" : "is-invalid";
        const code = data ? null : "duplicate";
        setResult(prev => ({
            ...prev,
            empEmail: {
                clazz: clazz,
                code: code
            },
        }));
    }, [emp]);
    const checkEmpName = useCallback(() => {
        const regex = /^[가-힣]{2,5}$/;
        const valid = regex.test(emp.empName);

        setResult(prev => ({
            ...prev,
            empName: valid ? "is-valid" : "is-invalid"
        }));
    }, [emp]);

    const allValid = useMemo(() => {
        if (result.empEmail.clazz !== "is-valid") return false;
        if (result.empName === "is-invalid") return false;
        return true;
    }, [result]);

    const invite = useCallback(async () => {
        const result = await Swal.fire({
            title: "사용자 초대 이메일을 보내시겠습니까?",
            icon: "warning",
            confirmButtonText: "네",
            cancelButtonText: "아니오",
            showCancelButton: true,
        });
        if (result.isConfirmed === false) return;
        await apiClient.post("/admin/add", emp);
        navigate("/");
        toast.success("사용자 초대 완료!");
    }, [emp]);
    return (<>

        <Row>
            <Col>
                <h1>사용자 초대하기</h1>
                <span>임시비밀번호와 함께 회원 가입 링크를 이메일로 보냅니다.</span>
            </Col>
        </Row>
        <Row className="mt-4">
            <Form.Label column sm={3}>이름</Form.Label>
            <Col sm={9}>
                <Form.Control type="text" name="empName" value={emp.empName}
                    onChange={changeStringValue}
                    onBlur={checkEmpName}
                    className={`${result.empName} w-50 d-inline-block`}
                    placeholder="사용자 이름"
                    autoFocus />
            </Col>
        </Row>

        <Row className="mt-4">
            <Form.Label column sm={3}>이메일</Form.Label>
            <Col sm={9}>
                <Form.Control type="text" name="empEmail" value={emp.empEmail}
                    onChange={changeStringValue}
                    onBlur={checkEmpEmail}
                    className={`${result.empEmail.clazz} w-50 d-inline-block`}
                    placeholder="사용자 이메일"
                />
                <div className="invalid-feedback">
                    {result.empEmail.code === "format" && (<>
                        올바르지 않은 이메일 형식입니다
                    </>)}
                    {result.empEmail.code === "duplicate" && (<>
                        이미 사용중인 이메일입니다.
                    </>)}
                </div>
            </Col>
        </Row>
        <Row className="mt-4">
            <Form.Label column sm={3}>부서</Form.Label>
            <Col sm={9}>
                <Form.Select onClick={deptNameSearch} name="empDeptNo"
                    className="w-50 d-inline-block"
                    value={emp.empDeptNo}
                    onChange={changeNumericValue}>
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
            <Form.Label column sm={3}>직급</Form.Label>
            <Col sm={9}>
                <Form.Select onClick={positionNameSearch} name="empPositionNo"
                    className="w-50 d-inline-block"
                    value={emp.empPositionNo}
                    onChange={changeNumericValue}>
                    <option value="">선택하세요</option>
                    {positionList.map(position => (
                        <option key={position.positionNo} value={position.positionNo}>
                            {position.positionName}
                        </option>
                    ))}
                </Form.Select>
            </Col>
        </Row>


        <Row className="mt-4 text-center">
            <Col>


                <Button onClick={invite} disabled={allValid === false}>
                    초대하기
                </Button>
            </Col>
        </Row>

        <div className="div-line mt-5"></div>
        <Row className="mt-5">
            <Col>
                <h3>관리자 지정</h3>
                <span>현재 활성화 상태인 회원을 관리자로 지정할 수 있습니다.</span>
            </Col>
        </Row>

        <Row className="mt-4 mb-4">
            <Form.Label column sm={3} className="mb-2">회원 검색하기</Form.Label>
            <Form autoComplete="off"
                onSubmit={empSearch}
            >
                <div className="w-100 search-area d-flex">


                    <Form.Control type="text" name="keyword"
                        value={keyword}
                        placeholder="검색"
                        onChange={(e) => {
                            const value = e.target.value;
                            setKeyword(value);
                            setShowAutoComplete(true);
                        }}
                        className="w-25"
                    ></Form.Control>

                    {showAutoComplete && (
                        <div className="autocomplete">
                            {autoCompleteList.map(emp => (
                                <div key={emp.empNo} className="autocomplete-item"
                                    onClick={() => {
                                        fillkeyword(emp);
                                        empSearch();
                                    }}
                                >
                                    {emp.empName}
                                    <span>({emp.deptName}/{emp.positionName})</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button type="submit" className="ms-2">
                        <FaMagnifyingGlass />
                    </Button>
                </div>
            </Form>
        </Row>

        {resultList.map((emp) => (


            <div key={emp.empNo}>
                <Row className="list-box">
                    <Col className="d-none d-lg-block text-truncate text-nowrap"
                         onClick={() => becomeAdmin(emp)}>
                            <MdAdminPanelSettings />
                        <span className="ms-2">관리자로 지정하기
                        </span>
                    </Col>
                    <Col className="text-nowrap">
                        <span className="ms-2">{emp.empNo}/{emp.empName}</span>
                    </Col>
                    <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empEmail}</Col>
                    <Col className="text-truncate text-nowrap">{emp.deptName}</Col>
                    <Col className="text-truncate text-nowrap">{emp.positionName}</Col>
                    <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empLevel}</Col>
                    <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empContact}</Col>
                    <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empAddress1}</Col>
                    <Col className="d-none d-lg-block text-truncate text-nowrap"
                        onClick={() => {
                            setResultList(prev =>
                                prev.filter(item => item.empNo !== emp.empNo)
                            );
                        }}>
                        <span>
                            <FaXmark />
                        </span>
                    </Col>
                </Row>
            </div>
        ))}
    </>)
}