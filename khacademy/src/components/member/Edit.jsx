
import { useState } from "react";
import { useKakaoPostcodePopup } from 'react-daum-postcode';



export default function Edit() {
    //kakao post
    const open = useKakaoPostcodePopup("//t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js");

    //state
    const [emp, setEmp] = useState({
        empEmail : "",
        empName : "", 
        

    });

    return (<>
        <h1>내 정보 수정</h1>
    </>)
}